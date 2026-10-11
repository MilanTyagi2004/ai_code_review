package samples;

/**
 * ComplexCalculator demonstrates Cyclomatic Complexity, Cognitive Complexity,
 * Deeply Nested Conditions, and Excessive Parameter List smells.
 */
public class ComplexCalculator {

    // Smell: ExcessiveParameterList (6 parameters)
    public double computeTaxAndDiscount(double basePrice, double taxRate, double discountRate,
                                         int customerTier, boolean isHoliday, boolean isVip) {
        double result = basePrice;

        // Smells: AvoidDeeplyNestedIfStmts & CollapsibleIfStatements & High Complexity
        if (basePrice > 0) {
            if (taxRate >= 0) {
                if (discountRate >= 0) {
                    if (customerTier > 0) {
                        if (customerTier == 1) {
                            result = basePrice * (1 + taxRate) * 0.95;
                        } else if (customerTier == 2) {
                            result = basePrice * (1 + taxRate) * 0.90;
                        } else if (customerTier == 3) {
                            result = basePrice * (1 + taxRate) * 0.85;
                        } else {
                            result = basePrice * (1 + taxRate);
                        }
                    }
                }
            }
        }

        // Additional complexity branches (Cyclomatic Complexity > 10)
        if (isHoliday) {
            if (isVip) {
                result -= 25.0;
            } else {
                result -= 10.0;
            }
        } else {
            if (isVip) {
                result -= 15.0;
            }
        }

        if (result < 0) {
            result = 0.0;
        }

        return result;
    }
}
