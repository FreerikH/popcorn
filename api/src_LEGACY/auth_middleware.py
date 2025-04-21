"""
Authentication middleware for handling JWT tokens in cookies.
"""
from fastapi import Request, HTTPException, status
from fastapi.security import OAuth2
from fastapi.security.utils import get_authorization_scheme_param
from fastapi.openapi.models import OAuthFlows as OAuthFlowsModel
from typing import Optional

class OAuth2PasswordBearerWithCookie(OAuth2):
    """
    OAuth2 password bearer scheme that works with cookies.
    
    This class extracts the JWT token from a cookie rather than from
    the Authorization header.
    """
    def __init__(
        self,
        tokenUrl: str,
        scheme_name: Optional[str] = None,
        scopes: Optional[dict] = None,
        auto_error: bool = True,
    ):
        if not scopes:
            scopes = {}
        flows = OAuthFlowsModel(password={"tokenUrl": tokenUrl, "scopes": scopes})
        super().__init__(flows=flows, scheme_name=scheme_name, auto_error=auto_error)
        print(f"[DEBUG] OAuth2PasswordBearerWithCookie initialized with tokenUrl: {tokenUrl}")

    async def __call__(self, request: Request) -> str:
        # Get the token from the cookie
        cookie_authorization: str = request.cookies.get("access_token")
        
        print("[DEBUG] Cookie authorization value:", cookie_authorization)
        
        # If no cookie is present
        if not cookie_authorization:
            print("[DEBUG] No access_token cookie found")
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                return None
        
        # Extract token from "Bearer {token}"
        scheme, token = get_authorization_scheme_param(cookie_authorization)
        
        print(f"[DEBUG] Auth scheme: '{scheme}', Token type: {type(token)}, Token length: {len(token) if token else 0}")
        
        # Validate that we have a Bearer token
        if scheme.lower() != "bearer":
            print(f"[DEBUG] Invalid scheme: {scheme}")
            if self.auto_error:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication scheme",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            else:
                return None
        
        # Return just the token part without the "Bearer " prefix
        print(f"[DEBUG] Returning token: {token[:10]}... (truncated)")
        return token