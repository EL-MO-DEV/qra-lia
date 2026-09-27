package ma.qralia.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        boolean mockAi,
        String timezone,
        int maxImageBytes,
        int rateLimitPerMinute,
        int aiTimeoutSeconds,
        Cors cors,
        Gemini gemini,
        Groq groq
) {
    public record Cors(List<String> allowedOrigins) {}

    public record Gemini(String apiKey, String model) {
        public boolean enabled() {
            return apiKey != null && !apiKey.isBlank();
        }
    }

    public record Groq(String apiKey, String model, String baseUrl) {
        public boolean enabled() {
            return apiKey != null && !apiKey.isBlank();
        }
    }
}
