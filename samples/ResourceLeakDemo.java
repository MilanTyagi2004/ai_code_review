package samples;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * ResourceLeakDemo demonstrates EmptyCatchBlock, CloseResource leak,
 * and UnusedPrivateField smells.
 */
public class ResourceLeakDemo {

    // Smell: UnusedPrivateField
    private String unusedSecretKey = "sk_unused_debug_value";

    // Smell: CloseResource leak (FileInputStream / FileOutputStream unclosed)
    public void copyFileUnsafe(String sourcePath, String destPath) {
        FileInputStream in = null;
        FileOutputStream out = null;
        try {
            in = new FileInputStream(sourcePath);
            out = new FileOutputStream(destPath);
            byte[] buffer = new byte[1024];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        } catch (IOException e) {
            // Smell: EmptyCatchBlock & AvoidPrintStackTrace
            e.printStackTrace();
        }
        // Missing finally block to close 'in' and 'out'
    }

    // Smell: EmptyCatchBlock
    public void processData(String input) {
        try {
            int parsed = Integer.parseInt(input);
            System.out.println("Value: " + parsed);
        } catch (NumberFormatException e) {
            // Smell: Empty catch block ignoring failure
        }
    }
}
