"""
Abstract Base Class for Job Source Connectors with SSRF Defense
"""
import ipaddress
import socket
from abc import ABC, abstractmethod
from typing import List, Optional
from urllib.parse import urlparse
import httpx
from backend.app.schemas.job import NormalizedJob


def is_safe_url(url: str) -> bool:
    """
    SSRF Protection: Validates that a URL uses http/https and does not resolve
    to loopback, private, link-local, or cloud metadata IP addresses.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False

        # Disallow localhost / known metadata hosts immediately
        if hostname.lower() in ("localhost", "127.0.0.1", "::1", "metadata.google.internal", "instance-data"):
            return False

        # Resolve IP addresses
        addr_info = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_loopback
                or ip_obj.is_private
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
            ):
                return False
        return True
    except Exception:
        return False


class BaseJobConnector(ABC):
    """
    Abstract interface for all job discovery sources.
    Can be invoked directly or wrapped in an MCP server tool.
    """

    def __init__(self, timeout_seconds: int = 15):
        self.timeout_seconds = timeout_seconds
        self.headers = {
            "User-Agent": "OpportuneAI-Bot/1.0 (+https://github.com/opportune-ai/opportune)"
        }

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Unique identifier for this source"""
        pass

    @abstractmethod
    async def search(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
        **kwargs
    ) -> List[NormalizedJob]:
        """Query listings from the source and return normalized jobs"""
        pass

    @abstractmethod
    async def check_health(self) -> bool:
        """Perform a lightweight reachability check"""
        pass
