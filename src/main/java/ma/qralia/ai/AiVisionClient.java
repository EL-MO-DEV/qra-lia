package ma.qralia.ai;

import ma.qralia.domain.ModelExtraction;

public interface AiVisionClient {

    String id();

    boolean enabled();

    ModelExtraction extract(byte[] imageBytes, String mimeType, boolean retryForValidJson);
}
