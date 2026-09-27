package ma.qralia.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.qralia.config.AppProperties;
import ma.qralia.domain.ModelExtraction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
public class GroqVisionClient implements AiVisionClient {

    private static final Logger log = LoggerFactory.getLogger(GroqVisionClient.class);

    private final AppProperties properties;
    private final ObjectMapper mapper;
    private final RestClient restClient;

    public GroqVisionClient(AppProperties properties, ObjectMapper mapper, RestClient.Builder builder) {
        this.properties = properties;
        this.mapper = mapper;
        this.restClient = builder
                .baseUrl(properties.groq().baseUrl())
                .build();
    }

    @Override
    public String id() {
        return "groq";
    }

    @Override
    public boolean enabled() {
        return properties.groq().enabled();
    }

    @Override
    public ModelExtraction extract(byte[] imageBytes, String mimeType, boolean retryForValidJson) {
        if (!enabled()) {
            throw new IllegalStateException("groq disabled");
        }
        String b64 = java.util.Base64.getEncoder().encodeToString(imageBytes);
        String prompt = retryForValidJson
                ? SystemPrompt.RETRY_INSTRUCTION + "\n" + SystemPrompt.TEXT
                : SystemPrompt.USER_INSTRUCTION + "\n" + SystemPrompt.TEXT + "\nSchema:\n" + SystemPrompt.JSON_SCHEMA;

        Map<String, Object> body = Map.of(
                "model", properties.groq().model(),
                "temperature", 0,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                        Map.of("role", "system", "content", SystemPrompt.TEXT),
                        Map.of(
                                "role", "user",
                                "content", List.of(
                                        Map.of("type", "text", "text", prompt),
                                        Map.of(
                                                "type", "image_url",
                                                "image_url", Map.of("url", "data:" + mimeType + ";base64," + b64)
                                        )
                                )
                        )
                )
        );

        try {
            String raw = restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.groq().apiKey())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            JsonNode root = mapper.readTree(raw);
            String content = root.path("choices").path(0).path("message").path("content").asText(null);
            return ExtractionParser.parse(mapper, content);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (RestClientResponseException e) {
            log.warn("groq_http status={}", e.getStatusCode().value());
            throw new AiProviderException("groq http " + e.getStatusCode().value(), e);
        } catch (Exception e) {
            log.warn("groq_failed type={}", e.getClass().getSimpleName());
            throw new AiProviderException("groq failed", e);
        }
    }
}
