package ma.qralia.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.HttpOptions;
import com.google.genai.types.Part;
import com.google.genai.types.Schema;
import ma.qralia.config.AppProperties;
import ma.qralia.domain.ModelExtraction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class GeminiVisionClient implements AiVisionClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiVisionClient.class);

    private final AppProperties properties;
    private final ObjectMapper mapper;

    public GeminiVisionClient(AppProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
    }

    @Override
    public String id() {
        return "gemini";
    }

    @Override
    public boolean enabled() {
        return properties.gemini().enabled();
    }

    @Override
    public ModelExtraction extract(byte[] imageBytes, String mimeType, boolean retryForValidJson) {
        if (!enabled()) {
            throw new IllegalStateException("gemini disabled");
        }
        int timeoutMs = properties.aiTimeoutSeconds() * 1000;
        try (Client client = Client.builder()
                .apiKey(properties.gemini().apiKey())
                .httpOptions(HttpOptions.builder().timeout(timeoutMs).build())
                .build()) {

            GenerateContentConfig config = GenerateContentConfig.builder()
                    .systemInstruction(Content.fromParts(Part.fromText(SystemPrompt.TEXT)))
                    .responseMimeType("application/json")
                    .responseJsonSchema(parseSchema())
                    .build();

            Content user = Content.fromParts(
                    Part.fromText(retryForValidJson ? SystemPrompt.RETRY_INSTRUCTION : SystemPrompt.USER_INSTRUCTION),
                    Part.fromBytes(imageBytes, mimeType)
            );

            GenerateContentResponse response = client.models.generateContent(
                    properties.gemini().model(),
                    user,
                    config
            );
            String text = response.text();
            return ExtractionParser.parse(mapper, text);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (RuntimeException e) {
            log.warn("gemini_failed type={}", e.getClass().getSimpleName());
            throw new AiProviderException("gemini failed", e);
        }
    }

    private Object parseSchema() {
        try {
            return mapper.readValue(SystemPrompt.JSON_SCHEMA, Object.class);
        } catch (Exception e) {
            throw new IllegalStateException("schema", e);
        }
    }
}
