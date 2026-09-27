package ma.qralia.service;

import ma.qralia.ai.AiProviderException;
import ma.qralia.ai.AiVisionClient;
import ma.qralia.ai.GeminiVisionClient;
import ma.qralia.ai.GroqVisionClient;
import ma.qralia.ai.MockVisionClient;
import ma.qralia.config.AppProperties;
import ma.qralia.domain.ModelExtraction;
import ma.qralia.domain.ReadResult;
import ma.qralia.mask.SensitiveDataMasker;
import ma.qralia.rules.RiskRulesEngine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZoneId;
import java.util.Base64;
import java.util.Set;

@Service
public class DocumentReadService {

    private static final Logger log = LoggerFactory.getLogger(DocumentReadService.class);
    private static final Set<String> MIMES = Set.of("image/jpeg", "image/png", "image/webp");

    private final AppProperties properties;
    private final GeminiVisionClient gemini;
    private final GroqVisionClient groq;
    private final MockVisionClient mock;
    private final SensitiveDataMasker masker;
    private final RiskRulesEngine rules;
    private final ActionPlanner actions;

    public DocumentReadService(
            AppProperties properties,
            GeminiVisionClient gemini,
            GroqVisionClient groq,
            MockVisionClient mock,
            SensitiveDataMasker masker,
            RiskRulesEngine rules,
            ActionPlanner actions
    ) {
        this.properties = properties;
        this.gemini = gemini;
        this.groq = groq;
        this.mock = mock;
        this.masker = masker;
        this.rules = rules;
        this.actions = actions;
    }

    public ReadResult read(String imageBase64, String mimeType, String mockScenario) {
        long started = System.currentTimeMillis();
        byte[] bytes = decodeAndValidate(imageBase64, mimeType);

        ModelExtraction extraction;
        String provider;
        try {
            var call = callModel(bytes, mimeType, mockScenario);
            extraction = call.extraction();
            provider = call.provider();
        } catch (AiUnavailableException e) {
            long latency = System.currentTimeMillis() - started;
            log.warn("read_failed request error=ai_unavailable latency_ms={}", latency);
            throw e;
        }

        ReadResult raw = extraction.toReadResult(provider, 0);
        ReadResult masked = masker.mask(raw);
        RiskRulesEngine.Ruled ruled = rules.apply(masked, ZoneId.of(properties.timezone()));
        ReadResult withRules = new ReadResult(
                masked.status(),
                masked.docType(),
                masked.sender(),
                masked.amount(),
                masked.deadline(),
                ruled.daysLeft(),
                masked.action(),
                ruled.riskLevel(),
                ruled.riskReasons(),
                ruled.scamSuspected(),
                clampConfidence(masked.confidence()),
                masked.darijaSummary(),
                provider,
                System.currentTimeMillis() - started,
                java.util.List.of()
        );
        var planned = actions.plan(withRules);
        ReadResult result = new ReadResult(
                withRules.status(),
                withRules.docType(),
                withRules.sender(),
                withRules.amount(),
                withRules.deadline(),
                withRules.daysLeft(),
                withRules.action(),
                withRules.riskLevel(),
                withRules.riskReasons(),
                withRules.scamSuspected(),
                withRules.confidence(),
                withRules.darijaSummary(),
                withRules.provider(),
                withRules.latencyMs(),
                planned
        );

        log.info(
                "read_ok status={} provider={} latency_ms={} risk={}",
                result.status(),
                result.provider(),
                result.latencyMs(),
                result.riskLevel()
        );
        return result;
    }

    private Call callModel(byte[] bytes, String mimeType, String mockScenario) {
        boolean forceMock = properties.mockAi() || (!gemini.enabled() && !groq.enabled());
        if (forceMock || (mockScenario != null && !mockScenario.isBlank())) {
            String scenario = mockScenario == null || mockScenario.isBlank() ? "low" : mockScenario;
            return new Call(mock.scenario(scenario), "gemini");
        }
        ModelExtraction fromGemini = tryProvider(gemini, bytes, mimeType);
        if (fromGemini != null) {
            return new Call(fromGemini, "gemini");
        }
        ModelExtraction fromGroq = tryProvider(groq, bytes, mimeType);
        if (fromGroq != null) {
            return new Call(fromGroq, "groq");
        }
        throw new AiUnavailableException();
    }

    private ModelExtraction tryProvider(AiVisionClient client, byte[] bytes, String mimeType) {
        if (!client.enabled()) {
            return null;
        }
        try {
            return client.extract(bytes, mimeType, false);
        } catch (IllegalArgumentException firstInvalid) {
            log.warn("provider_invalid_json provider={} retry=1", client.id());
            try {
                return client.extract(bytes, mimeType, true);
            } catch (RuntimeException retryFailed) {
                log.warn("provider_retry_failed provider={} type={}", client.id(), retryFailed.getClass().getSimpleName());
                return null;
            }
        } catch (RuntimeException e) {
            log.warn("provider_failed provider={} type={}", client.id(), e.getClass().getSimpleName());
            return null;
        }
    }

    byte[] decodeAndValidate(String imageBase64, String mimeType) {
        if (imageBase64 == null || imageBase64.isBlank() || mimeType == null || !MIMES.contains(mimeType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_input");
        }
        String payload = imageBase64.trim();
        int comma = payload.indexOf(',');
        if (payload.startsWith("data:") && comma > 0) {
            payload = payload.substring(comma + 1);
        }
        payload = payload.replaceAll("\\s", "");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_input");
        }
        if (bytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid_input");
        }
        if (bytes.length > properties.maxImageBytes()) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "image_too_large");
        }
        return bytes;
    }

    private static double clampConfidence(double c) {
        if (c < 0) {
            return 0;
        }
        if (c > 1) {
            return 1;
        }
        return c;
    }

    private record Call(ModelExtraction extraction, String provider) {}

    public static class AiUnavailableException extends RuntimeException {}
}
