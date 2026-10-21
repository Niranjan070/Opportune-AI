"""
Email Reporting and Idempotent Dispatch Service
Generates responsive HTML intelligence digests and dispatches them via Console, SMTP, or Resend
with strict database-backed idempotency protection against duplicate delivery.
"""
import html
import logging
import smtplib
import uuid
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.profile import SearchProfile
from backend.app.models.search_run import EmailDispatchLog, ScoredJob, SearchRun, SourceExecutionLog

logger = logging.getLogger("reporting")


class EmailReportService:
    @classmethod
    def generate_html_digest(
        cls,
        search_run: SearchRun,
        profile: SearchProfile,
        scored_jobs: List[ScoredJob],
        source_logs: List[SourceExecutionLog],
    ) -> str:
        """
        Generate a responsive, aesthetic HTML email digest for discovered job opportunities.
        """
        run_date = (search_run.completed_at or datetime.now(timezone.utc)).strftime("%B %d, %Y")
        profile_name = html.escape(profile.name if profile else "Daily Job Search")
        
        # Color & badge helpers
        def tier_badge(tier: str, score: float) -> str:
            t = (tier or "").lower()
            if t == "excellent" or score >= 85:
                bg = "#ecfdf5"
                color = "#065f46"
                border = "#a7f3d0"
                label = "Excellent Match"
            elif t == "strong" or score >= 70:
                bg = "#eff6ff"
                color = "#1e40af"
                border = "#bfdbfe"
                label = "Strong Match"
            elif t == "possible" or score >= 50:
                bg = "#fffbeb"
                color = "#92400e"
                border = "#fde68a"
                label = "Possible Match"
            else:
                bg = "#f3f4f6"
                color = "#374151"
                border = "#e5e7eb"
                label = "Low Match"
            return (
                f'<span style="display:inline-block; padding: 4px 10px; font-size: 12px; font-weight: 700; '
                f'border-radius: 9999px; background-color: {bg}; color: {color}; border: 1px solid {border};">'
                f'{score}% · {label}</span>'
            )

        # Build Job Cards HTML
        job_cards_html = []
        if not scored_jobs:
            job_cards_html.append(
                """
                <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; text-align: center; color: #6b7280;">
                    <p style="margin: 0; font-size: 15px;">No high-matching job opportunities found in this search cycle. The discovery pipeline will search again tomorrow at 9:00 AM.</p>
                </div>
                """
            )
        else:
            for item in scored_jobs:
                job = item.job
                job_title = html.escape(job.title if job else "Role Title")
                job_company = html.escape(job.company if job else "Company")
                job_location = html.escape(job.location or "Unspecified")
                workplace = html.escape(job.workplace_type.capitalize() if job and job.workplace_type else "Any")
                apply_url = html.escape(job.primary_url if job else "#")
                explanation = html.escape(item.explanation or "")

                # Matched skills tags
                matched_badges = "".join(
                    f'<span style="display:inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; font-size: 11px; font-weight: 600; border-radius: 4px; background-color: #e0e7ff; color: #3730a3;">{html.escape(s)}</span>'
                    for s in (item.matched_skills or [])[:6]
                )
                if not matched_badges:
                    matched_badges = '<span style="font-size: 12px; color: #9ca3af;">None specified</span>'

                # Freshness badge
                freshness = "Recently Checked"
                if job and job.verification_status:
                    freshness = job.verification_status.replace("_", " ").title()

                card = f"""
                <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 700; color: #111827;">
                                <a href="{apply_url}" target="_blank" style="color: #111827; text-decoration: none;">{job_title}</a>
                            </h3>
                            <div style="font-size: 13px; color: #4b5563; font-weight: 500;">
                                <strong>{job_company}</strong> &bull; {job_location} &bull; <span style="background-color: #f3f4f6; padding: 1px 6px; border-radius: 4px;">{workplace}</span>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            {tier_badge(item.score_tier, item.match_score)}
                        </div>
                    </div>
                    
                    <div style="margin: 12px 0 8px 0; padding: 10px 12px; background-color: #f9fafb; border-left: 3px solid #6366f1; border-radius: 0 4px 4px 0; font-size: 12px; color: #4b5563;">
                        <strong>Score Rationale:</strong> {explanation}
                    </div>

                    <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                        <span style="font-weight: 600; color: #374151;">Matched Skills:</span> {matched_badges}
                    </div>

                    <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: #9ca3af;">Status: <strong style="color: #059669;">{freshness}</strong></span>
                        <a href="{apply_url}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;">
                            View Opportunity &rarr;
                        </a>
                    </div>
                </div>
                """
                job_cards_html.append(card)

        # Build Source Execution Table
        source_rows = []
        for src in source_logs:
            status_color = "#059669" if src.status == "success" else "#dc2626"
            source_rows.append(
                f"""
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 8px 12px; font-size: 12px; font-weight: 600; color: #374151;">{html.escape(src.source_name.title())}</td>
                    <td style="padding: 8px 12px; font-size: 12px; color: {status_color}; font-weight: 600;">{html.escape(src.status.upper())}</td>
                    <td style="padding: 8px 12px; font-size: 12px; color: #4b5563; text-align: center;">{src.items_retrieved}</td>
                    <td style="padding: 8px 12px; font-size: 12px; color: #6b7280; text-align: right;">{src.latency_ms} ms</td>
                </tr>
                """
            )
        if not source_rows:
            source_rows.append('<tr><td colspan="4" style="padding: 8px 12px; text-align: center; color: #9ca3af; font-size: 12px;">No source execution data recorded.</td></tr>')

        source_table_html = f"""
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px; background-color: #ffffff; border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb;">
            <thead>
                <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <th style="padding: 8px 12px; font-size: 11px; text-align: left; color: #6b7280; text-transform: uppercase;">Source</th>
                    <th style="padding: 8px 12px; font-size: 11px; text-align: left; color: #6b7280; text-transform: uppercase;">Status</th>
                    <th style="padding: 8px 12px; font-size: 11px; text-align: center; color: #6b7280; text-transform: uppercase;">Retrieved</th>
                    <th style="padding: 8px 12px; font-size: 11px; text-align: right; color: #6b7280; text-transform: uppercase;">Latency</th>
                </tr>
            </thead>
            <tbody>
                {''.join(source_rows)}
            </tbody>
        </table>
        """

        # Full Responsive Email Template
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Opportune AI Daily Intelligence Digest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 680px; margin: 24px auto; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 28px; color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; color: #a5b4fc;">OPPORTUNE AI</span>
                <span style="font-size: 12px; color: #c7d2fe;">{run_date}</span>
            </div>
            <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; color: #ffffff;">Daily Opportunity Intelligence</h1>
            <p style="margin: 0; font-size: 14px; color: #e0e7ff;">Targeted search digest for <strong>{profile_name}</strong></p>
        </div>

        <!-- Metric Badges -->
        <div style="display: flex; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; padding: 14px 28px; justify-content: space-around; text-align: center;">
            <div>
                <div style="font-size: 20px; font-weight: 800; color: #4338ca;">{search_run.total_discovered}</div>
                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Discovered</div>
            </div>
            <div style="border-left: 1px solid #e5e7eb; padding-left: 24px;">
                <div style="font-size: 20px; font-weight: 800; color: #059669;">{len(scored_jobs)}</div>
                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Top Matches</div>
            </div>
            <div style="border-left: 1px solid #e5e7eb; padding-left: 24px;">
                <div style="font-size: 20px; font-weight: 800; color: #d97706;">{search_run.total_deduplicated}</div>
                <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600;">Deduplicated</div>
            </div>
        </div>

        <!-- Main Body -->
        <div style="padding: 24px 28px;">
            <div style="margin-bottom: 16px;">
                <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">
                    Top Matched Opportunities
                </h2>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">Ranked deterministically across skills, experience, title, and work arrangement.</p>
            </div>

            <!-- Job Cards List -->
            {''.join(job_cards_html)}

            <!-- Source Execution Summary -->
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <h3 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">
                    Source Execution Audit
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">Audit telemetry for permitted connectors queried during this cycle.</p>
                {source_table_html}
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f3f4f6; border-top: 1px solid #e5e7eb; padding: 20px 28px; text-align: center; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0 0 6px 0;">Opportune AI &bull; Intelligent Job Discovery Assistant</p>
            <p style="margin: 0 0 8px 0;">This email was delivered based on your scheduled search profile. No automated applications were submitted.</p>
            <p style="margin: 0; font-size: 11px; color: #d1d5db;">Run ID: {search_run.id}</p>
        </div>
    </div>
</body>
</html>
"""

    @classmethod
    def generate_plain_text_digest(
        cls,
        search_run: SearchRun,
        profile: SearchProfile,
        scored_jobs: List[ScoredJob],
    ) -> str:
        """
        Generate a plain-text fallback version for mail clients.
        """
        run_date = (search_run.completed_at or datetime.now(timezone.utc)).strftime("%B %d, %Y")
        profile_name = profile.name if profile else "Daily Job Search"
        lines = [
            f"OPPORTUNE AI — DAILY INTELLIGENCE DIGEST ({run_date})",
            f"Search Profile: {profile_name}",
            f"Discovered: {search_run.total_discovered} | Deduplicated: {search_run.total_deduplicated} | Top Matches: {len(scored_jobs)}",
            "=" * 70,
            "",
        ]

        if not scored_jobs:
            lines.append("No high-matching job opportunities found in this search cycle.")
        else:
            for idx, item in enumerate(scored_jobs, 1):
                job = item.job
                title = job.title if job else "Role"
                company = job.company if job else "Company"
                loc = job.location or "Unspecified"
                url = job.primary_url if job else ""
                lines.append(f"{idx}. {title} @ {company} ({item.match_score}% - {item.score_tier.upper()})")
                lines.append(f"   Location: {loc}")
                lines.append(f"   Skills Matched: {', '.join(item.matched_skills or [])}")
                lines.append(f"   Rationale: {item.explanation}")
                lines.append(f"   URL: {url}")
                lines.append("")

        lines.extend([
            "=" * 70,
            "Delivered by Opportune AI. No automated applications were submitted.",
            f"Run ID: {search_run.id}",
        ])
        return "\n".join(lines)

    @classmethod
    async def dispatch_email(
        cls,
        db: Session,
        search_run: SearchRun,
        profile: SearchProfile,
        scored_jobs: List[ScoredJob],
        source_logs: List[SourceExecutionLog],
        recipient_email: Optional[str] = None,
        force: bool = False,
    ) -> Dict[str, Any]:
        """
        Dispatch the generated email digest with strict database-backed idempotency.
        """
        recipient = (
            recipient_email
            or (profile.notification_email if profile else None)
            or settings.DEFAULT_RECIPIENT_EMAIL
        )
        idempotency_key = f"run_{search_run.id}_{recipient.lower().strip()}"

        # 1. Idempotency Check
        existing_log = (
            db.query(EmailDispatchLog)
            .filter(
                EmailDispatchLog.idempotency_key == idempotency_key,
                EmailDispatchLog.status == "sent",
            )
            .first()
        )

        if existing_log and not force:
            logger.info(
                f"Idempotency hit: Email for search run {search_run.id} to {recipient} already dispatched at {existing_log.sent_at}."
            )
            return {
                "id": existing_log.id,
                "status": "skipped",
                "message": "Email already dispatched for this search run (idempotent duplicate prevention).",
                "recipient": recipient,
                "provider": existing_log.provider,
                "idempotency_key": idempotency_key,
                "sent_at": existing_log.sent_at,
            }

        # 2. Content Generation
        subject = f"[Opportune AI] Job Digest: {len(scored_jobs)} Opportunities Discovered ({datetime.now().strftime('%b %d')})"
        html_content = cls.generate_html_digest(search_run, profile, scored_jobs, source_logs)
        text_content = cls.generate_plain_text_digest(search_run, profile, scored_jobs)

        provider = settings.EMAIL_PROVIDER.lower().strip()
        provider_message_id = None
        error_msg = None
        dispatch_status = "sent"

        # 3. Provider Execution
        try:
            if provider == "console":
                provider_message_id = f"console-{uuid.uuid4().hex[:12]}"
                logger.info(
                    f"\n--- [EMAIL DISPATCH VIA CONSOLE] ---\n"
                    f"To: {recipient}\n"
                    f"Subject: {subject}\n"
                    f"Top Jobs Count: {len(scored_jobs)}\n"
                    f"Message ID: {provider_message_id}\n"
                    f"------------------------------------\n"
                )

            elif provider == "resend":
                if not settings.RESEND_API_KEY:
                    raise ValueError("RESEND_API_KEY is not configured.")
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "from": settings.EMAIL_FROM,
                            "to": [recipient],
                            "subject": subject,
                            "html": html_content,
                            "text": text_content,
                        },
                    )
                    if resp.status_code not in (200, 201):
                        raise RuntimeError(f"Resend API error ({resp.status_code}): {resp.text}")
                    data = resp.json()
                    provider_message_id = data.get("id")

            elif provider == "smtp":
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = settings.EMAIL_FROM
                msg["To"] = recipient
                msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    if settings.SMTP_USE_TLS:
                        server.starttls()
                    if settings.SMTP_USER and settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.EMAIL_FROM, [recipient], msg.as_string())
                provider_message_id = f"smtp-{uuid.uuid4().hex[:12]}"

            else:
                raise ValueError(f"Unsupported EMAIL_PROVIDER '{provider}'. Use 'console', 'resend', or 'smtp'.")

        except Exception as e:
            logger.error(f"Failed to dispatch email via {provider}: {e}", exc_info=True)
            dispatch_status = "failed"
            error_msg = str(e)

        # 4. Record Execution in Database
        if force:
            record_key = f"{idempotency_key}_forced_{uuid.uuid4().hex[:6]}"
        elif dispatch_status == "sent":
            record_key = idempotency_key
        else:
            record_key = f"{idempotency_key}_{uuid.uuid4().hex[:6]}"

        log_entry = EmailDispatchLog(
            id=str(uuid.uuid4()),
            search_run_id=search_run.id,
            recipient_email=recipient,
            idempotency_key=record_key,
            status=dispatch_status,
            provider=provider,
            provider_message_id=provider_message_id,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        if dispatch_status == "failed":
            raise RuntimeError(f"Email dispatch failed: {error_msg}")

        return {
            "id": log_entry.id,
            "status": "sent",
            "message": f"Email digest dispatched successfully via {provider}.",
            "recipient": recipient,
            "provider": provider,
            "provider_message_id": provider_message_id,
            "idempotency_key": idempotency_key,
            "sent_at": log_entry.sent_at,
        }
