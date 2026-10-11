package samples;

/**
 * CleanSample represents well-designed, clean Java code following
 * SOLID principles, clean code conventions, and best practices.
 * Expected violations: 0.
 */
public final class CleanSample {

    private final String serviceName;
    private final int timeoutSeconds;

    public CleanSample(String serviceName, int timeoutSeconds) {
        if (serviceName == null || serviceName.isBlank()) {
            throw new IllegalArgumentException("Service name must not be blank");
        }
        if (timeoutSeconds <= 0) {
            throw new IllegalArgumentException("Timeout must be positive");
        }
        this.serviceName = serviceName;
        this.timeoutSeconds = timeoutSeconds;
    }

    public String formatEndpoint(String path) {
        if (path == null) {
            return this.serviceName + "/v1/default";
        }
        return this.serviceName + "/v1/" + path.trim();
    }

    public boolean isValidTimeout(int value) {
        return value > 0 && value <= this.timeoutSeconds;
    }

    public String getServiceName() {
        return this.serviceName;
    }

    public int getTimeoutSeconds() {
        return this.timeoutSeconds;
    }
}
