from backend.app.services.normalizer import NormalizationService
from backend.app.services.job_storage import JobStorageService
from backend.app.services.mcp_client import MCPToolRegistry, mcp_tool_registry
from backend.app.services.orchestrator import DiscoveryOrchestrator, discovery_orchestrator
from backend.app.services.ai_intelligence import AIIntelligenceService
from backend.app.services.scorer import DeterministicScoringService
from backend.app.services.chat_agent import ChatAgentService

chat_agent_service = ChatAgentService()

__all__ = [
    "NormalizationService",
    "JobStorageService",
    "MCPToolRegistry",
    "mcp_tool_registry",
    "DiscoveryOrchestrator",
    "discovery_orchestrator",
    "AIIntelligenceService",
    "DeterministicScoringService",
    "ChatAgentService",
    "chat_agent_service",
]
