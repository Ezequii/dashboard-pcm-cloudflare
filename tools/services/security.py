from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping


class SecurityConfigurationError(RuntimeError):
    """Raised when production security settings are unsafe."""


@dataclass(frozen=True)
class SecurityPolicy:
    environment: str
    access_required: bool
    anonymous_access_allowed: bool
    fail_closed: bool
    classification: str
    allowed_roles: tuple[str, ...]
    restricted_fields: tuple[str, ...]
    identity_endpoint: str
    local_development_allowed: bool


def parse_security_policy(config: Mapping[str, Any]) -> SecurityPolicy:
    policy = SecurityPolicy(
        environment=str(config.get("environment", "production")).lower(),
        access_required=bool(config.get("accessRequired", True)),
        anonymous_access_allowed=bool(config.get("anonymousAccessAllowed", False)),
        fail_closed=bool(config.get("failClosed", True)),
        classification=str(config.get("dataClassification", "interno")),
        allowed_roles=tuple(str(role) for role in config.get("allowedRoles", [])),
        restricted_fields=tuple(str(field) for field in config.get("restrictedFields", [])),
        identity_endpoint=str(
            config.get("identityEndpoint", "/cdn-cgi/access/get-identity")
        ),
        local_development_allowed=bool(
            config.get("localDevelopmentAllowed", True)
        ),
    )
    validate_security_policy(policy)
    return policy


def validate_security_policy(policy: SecurityPolicy) -> None:
    if policy.environment == "production":
        if policy.anonymous_access_allowed:
            raise SecurityConfigurationError(
                "Produção não pode permitir acesso anônimo."
            )
        if not policy.access_required:
            raise SecurityConfigurationError(
                "Produção deve exigir autenticação corporativa."
            )
        if not policy.fail_closed:
            raise SecurityConfigurationError(
                "Produção deve falhar fechada."
            )
    if not policy.allowed_roles:
        raise SecurityConfigurationError(
            "Nenhum perfil de acesso foi configurado."
        )
    if "viewer" not in policy.allowed_roles:
        raise SecurityConfigurationError(
            "O perfil viewer deve existir."
        )
