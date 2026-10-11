import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Resolve paths to PMD libraries and custom ruleset
const PROJECT_ROOT = path.resolve('..');
const PMD_HOME = path.join(PROJECT_ROOT, 'tools', 'pmd-bin-7.28.0');
const CONF_DIR = path.join(PMD_HOME, 'conf');
const LIB_DIR = path.join(PMD_HOME, 'lib');
const CLASSPATH = `${CONF_DIR};${LIB_DIR}/*`;
const RULESET_PATH = path.resolve('config', 'pmd-ruleset.xml');

/**
 * Maps PMD priority (1-5) to standardized severity names.
 */
function mapPriorityToSeverity(priority) {
    switch (priority) {
        case 1:
            return 'CRITICAL';
        case 2:
            return 'HIGH';
        case 3:
            return 'MEDIUM';
        case 4:
            return 'LOW';
        case 5:
        default:
            return 'INFO';
    }
}

/**
 * Extracts snippet lines from source code.
 */
function extractSnippet(lines, beginLine, endLine) {
    if (!lines || lines.length === 0) return '';
    const start = Math.max(0, beginLine - 1);
    const end = Math.min(lines.length, endLine);
    return lines.slice(start, end).join('\n');
}

/**
 * Generates an educational explanation of why this PMD rule violation matters.
 */
function generateWhyItMatters(rule, description) {
    const explanations = {
        CyclomaticComplexity: 'High cyclomatic complexity increases the number of linearly independent execution paths, making testing exponentially harder and increasing defect probability.',
        CognitiveComplexity: 'Cognitive complexity measures how difficult the control flow is for humans to comprehend. High values impair readability and developer onboarding.',
        ExcessiveParameterList: 'Long parameter lists make method invocation error-prone, signal missing parameter object abstractions, and degrade maintainability.',
        AvoidDeeplyNestedIfStmts: 'Deep nesting creates "arrow anti-pattern" code, increasing mental state tracking and hiding edge-case logic.',
        CollapsibleIfStatements: 'Sequential nested if-conditions without else branches clutter control flow and should be combined using logical operators (&&).',
        GodClass: 'God classes violate the Single Responsibility Principle, centralizing too much logic and becoming fragile bottlenecks during refactoring.',
        DataClass: 'Data classes hold data without behavior, often leading to Feature Envy where external classes manipulate their fields directly.',
        CouplingBetweenObjects: 'High afferent/efferent coupling reduces class modularity, making changes in one class cascade unexpectedly into others.',
        UnusedPrivateField: 'Dead fields confuse maintainers, inflate object memory, and may indicate forgotten features or incomplete refactoring.',
        UnusedLocalVariable: 'Unused local variables clutter the method body and waste cognitive effort during code reviews.',
        UnusedPrivateMethod: 'Unused private methods represent dead code that should be purged to keep codebases lean and maintainable.',
        EmptyCatchBlock: 'Empty catch blocks silently swallow exceptions, concealing production bugs, runtime corruption, and silent data loss.',
        CloseResource: 'Unclosed streams, sockets, or database connections cause memory and file descriptor leaks, ultimately crashing server runtimes.',
        SystemPrintln: 'Direct console logging bypasses logging frameworks (SLF4J/Logback), losing timestamps, log levels, and log rotation.',
        AvoidPrintStackTrace: 'Printing stack traces directly to standard error risks leaking sensitive system details and cannot be routed to centralized observability.',
        SimplifyBooleanReturns: 'Verbose if-else blocks returning boolean literals can be replaced with direct boolean expressions, reducing verbosity.'
    };
    return explanations[rule] || description || 'Code quality defect violating clean architecture standards.';
}

/**
 * Provides actionable refactoring advice for common PMD rules.
 */
function generateFixAdvice(rule) {
    const advice = {
        CyclomaticComplexity: 'Extract helper methods or apply the Strategy Pattern to replace complex conditional branches.',
        CognitiveComplexity: 'Decompose nested loops and early-return guard clauses to flatten the execution flow.',
        ExcessiveParameterList: 'Introduce a Parameter Object or Record to encapsulate related parameters.',
        AvoidDeeplyNestedIfStmts: 'Invert conditional checks into guard clauses that return early, avoiding nested indentation.',
        CollapsibleIfStatements: 'Combine the nested conditions into a single statement using the logical AND (&&) operator.',
        GodClass: 'Break the class into cohesive smaller classes following Single Responsibility Principle (SRP).',
        DataClass: 'Encapsulate data with domain behaviors and methods rather than exposing raw getters/setters.',
        UnusedPrivateField: 'Remove the unused field or utilize it where intended.',
        UnusedLocalVariable: 'Remove the variable declaration to declutter the method scope.',
        EmptyCatchBlock: 'Log the exception appropriately or propagate it as a custom domain exception.',
        CloseResource: 'Wrap the resource in a Java try-with-resources statement to guarantee automatic disposal.',
        SystemPrintln: 'Replace System.out.println with a configured SLF4J Logger (e.g., logger.info(...)).',
        AvoidPrintStackTrace: 'Use logger.error("Message", exception) instead of e.printStackTrace().'
    };
    return advice[rule] || 'Refactor code to follow clean coding standards and eliminate rule violations.';
}

/**
 * Runs PMD static analysis on the provided Java source code.
 *
 * @param {string} sourceCode - Raw Java code content
 * @param {string} [fileName="SubmittedCode.java"] - Name of the file
 * @returns {Promise<object>} Analysis result with structured violations
 */
export async function runStaticAnalysis(sourceCode, fileName = 'SubmittedCode.java') {
    if (!sourceCode || typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
        throw new Error('Java source code cannot be empty');
    }

    const startTime = Date.now();
    const tempDir = path.join(os.tmpdir(), `pmd_run_${uuidv4()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    const safeFileName = path.basename(fileName).endsWith('.java')
        ? path.basename(fileName)
        : 'SubmittedCode.java';
    const javaFilePath = path.join(tempDir, safeFileName);
    const reportFilePath = path.join(tempDir, 'pmd_report.json');

    fs.writeFileSync(javaFilePath, sourceCode, 'utf8');
    const sourceLines = sourceCode.split('\n');

    try {
        const javaArgs = [
            '-cp', CLASSPATH,
            'net.sourceforge.pmd.cli.PmdCli',
            'check',
            '-d', javaFilePath,
            '-R', RULESET_PATH,
            '-f', 'json',
            '-r', reportFilePath,
            '--no-progress'
        ];

        // Execute Java PMD CLI directly with safe timeout
        await new Promise((resolve, reject) => {
            execFile('java', javaArgs, {
                timeout: 25000,
                maxBuffer: 10 * 1024 * 1024,
                windowsHide: true
            }, (error, stdout, stderr) => {
                // PMD returns exit code 4 when violations are found; 0 when none found.
                // Both are successful runs.
                if (error && error.code !== 4 && error.code !== 0) {
                    if (error.killed) {
                        return reject(new Error('PMD static analysis timed out after 25 seconds'));
                    }
                    if (!fs.existsSync(reportFilePath)) {
                        return reject(new Error(`PMD execution failed: ${stderr || error.message}`));
                    }
                }
                resolve();
            });
        });

        if (!fs.existsSync(reportFilePath)) {
            throw new Error('PMD did not produce a report output file');
        }

        const reportRaw = fs.readFileSync(reportFilePath, 'utf8');
        const reportData = JSON.parse(reportRaw);

        const violations = [];
        const filesList = reportData.files || [];

        for (const fileObj of filesList) {
            for (const v of fileObj.violations || []) {
                const beginLine = v.beginline || 1;
                const endLine = v.endline || beginLine;
                const snippet = extractSnippet(sourceLines, beginLine, endLine);
                const ruleName = v.rule;
                const severity = mapPriorityToSeverity(v.priority);

                violations.push({
                    id: `static_${uuidv4().substring(0, 8)}`,
                    rule: ruleName,
                    category: v.ruleset || 'Design & Best Practices',
                    severity: severity,
                    priority: v.priority,
                    line: beginLine,
                    endLine: endLine,
                    column: v.begincolumn || 1,
                    message: v.description || 'Static rule violation detected',
                    whyItMatters: generateWhyItMatters(ruleName, v.description),
                    suggestedFix: generateFixAdvice(ruleName),
                    snippet: snippet,
                    source: 'STATIC_ONLY',
                    sourceLabel: 'Static Analysis (PMD 7)',
                    externalInfoUrl: v.externalInfoUrl || ''
                });
            }
        }

        const executionDuration = Date.now() - startTime;

        return {
            mode: 'static',
            status: 'SUCCESS',
            fileName: safeFileName,
            totalViolations: violations.length,
            findings: violations,
            processingErrors: reportData.processingErrors || [],
            executionDurationMs: executionDuration,
            analyzedAt: new Date().toISOString()
        };

    } finally {
        // Clean up temporary files safely
        try {
            if (fs.existsSync(javaFilePath)) fs.unlinkSync(javaFilePath);
            if (fs.existsSync(reportFilePath)) fs.unlinkSync(reportFilePath);
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            console.error('Failed to clean up temp dir:', cleanupErr.message);
        }
    }
}
