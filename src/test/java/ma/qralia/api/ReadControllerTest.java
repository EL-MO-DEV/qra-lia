package ma.qralia.api;

import ma.qralia.QraLiaApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Base64;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = QraLiaApplication.class, properties = "app.mock-ai=true")
@AutoConfigureMockMvc
class ReadControllerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void mockReadReturnsContract() throws Exception {
        String b64 = Base64.getEncoder().encodeToString("fake-jpeg-bytes-for-mock".getBytes());
        mvc.perform(post("/api/read")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageBase64\":\"" + b64 + "\",\"mimeType\":\"image/jpeg\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.doc_type").value("facture électricité"))
                .andExpect(jsonPath("$.risk_level").value("low"))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.darija_summary").isNotEmpty())
                .andExpect(jsonPath("$.recommended_actions[0].code").value("EXPLAIN_DARIJA"));
    }

    @Test
    void unreadableScenario() throws Exception {
        String b64 = Base64.getEncoder().encodeToString("x".repeat(20).getBytes());
        mvc.perform(post("/api/read")
                        .header("X-Mock-Scenario", "unreadable")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageBase64\":\"" + b64 + "\",\"mimeType\":\"image/png\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("unreadable"))
                .andExpect(jsonPath("$.darija_summary").value(containsString("الصورة")));
    }

    @Test
    void scamScenarioIsHigh() throws Exception {
        String b64 = Base64.getEncoder().encodeToString("x".repeat(20).getBytes());
        mvc.perform(post("/api/read")
                        .header("X-Mock-Scenario", "scam")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageBase64\":\"" + b64 + "\",\"mimeType\":\"image/webp\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scam_suspected").value(true))
                .andExpect(jsonPath("$.risk_level").value("high"))
                .andExpect(jsonPath("$.recommended_actions[*].code", hasItem("SCAM_ALERT")));
    }

    @Test
    void rejectsBadMime() throws Exception {
        mvc.perform(post("/api/read")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageBase64\":\"aaaa\",\"mimeType\":\"application/pdf\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("invalid_input"));
    }

    @Test
    void rejectsMissingBody() throws Exception {
        mvc.perform(post("/api/read")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("invalid_input"));
    }
}
