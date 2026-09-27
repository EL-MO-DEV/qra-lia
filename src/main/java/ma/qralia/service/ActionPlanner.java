package ma.qralia.service;

import ma.qralia.domain.ReadResult;
import ma.qralia.domain.RecommendedAction;
import ma.qralia.rules.RiskRulesEngine;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ActionPlanner {

    public List<RecommendedAction> plan(ReadResult result) {
        List<RecommendedAction> actions = new ArrayList<>();
        actions.add(new RecommendedAction(
                "EXPLAIN_DARIJA",
                "شرح بالدارجة + صوت",
                result.darijaSummary()
        ));

        if (result.action() != null && !result.action().isBlank()) {
            actions.add(new RecommendedAction(
                    "DO_NOW",
                    "شنو خاصك دير دابا",
                    result.action()
            ));
        }

        if (result.deadline() != null) {
            String when = result.daysLeft() != null && result.daysLeft() <= 1
                    ? "ذكّر راسك اليوم قبل ما يفوت الأجل"
                    : "حط تذكير قبل تاريخ " + result.deadline();
            actions.add(new RecommendedAction(
                    "REMINDER",
                    "تذكير قبل الأجل",
                    when
            ));
        }

        boolean share = result.scamSuspected()
                || "high".equals(result.riskLevel())
                || "medium".equals(result.riskLevel())
                || result.confidence() < 0.6
                || !"ok".equals(result.status());
        if (share) {
            actions.add(new RecommendedAction(
                    "SHARE_FAMILY",
                    "صيفط لشي حد من العائلة باش يأكد",
                    "الإنسان هو اللي كيقرر ف الأخير، ماشي الذكاء الاصطناعي."
            ));
        }

        if (result.scamSuspected()) {
            actions.add(new RecommendedAction(
                    "SCAM_ALERT",
                    "تنبيه: ممكن تكون نصب",
                    "متصيفط حتى كود، موت دو باس، ولا فلوس لحساب شخصي."
            ));
        }

        if (result.confidence() < 0.6 || !"ok".equals(result.status())) {
            actions.add(new RecommendedAction(
                    "VERIFY",
                    "تأكد مع شي حد",
                    RiskRulesEngine.REASON_VERIFY
            ));
        }

        return List.copyOf(actions);
    }
}
