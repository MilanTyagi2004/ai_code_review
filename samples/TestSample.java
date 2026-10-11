package samples;

public class TestSample {
    private int unusedField = 42;

    public void emptyMethod() {
    }

    public int overlyComplex(int a, int b, int c, int d) {
        if (a > 0) {
            if (b > 0) {
                if (c > 0) {
                    if (d > 0) {
                        return a + b + c + d;
                    }
                }
            }
        }
        return 0;
    }
}
