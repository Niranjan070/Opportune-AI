"""
Conversational AI Job Discovery Chat REST Endpoints
Provides session management, multi-turn message handling, MCP agent invocation,
and one-click daily email alert subscriptions.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.models.profile import SearchProfile
from backend.app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionUpdate,
    ChatSessionResponse,
    ChatSessionDetailResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSubscribeRequest,
)
from backend.app.services.chat_agent import chat_agent_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/sessions", response_model=List[ChatSessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    """List all conversational chat sessions, sorted by last update"""
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    results = []
    for s in sessions:
        msg_count = db.query(func.count(ChatMessage.id)).filter(ChatMessage.session_id == s.id).scalar() or 0
        resp = ChatSessionResponse(
            id=s.id,
            title=s.title,
            search_criteria=s.search_criteria or {},
            is_email_subscribed=s.is_email_subscribed,
            subscriber_email=s.subscriber_email,
            search_profile_id=s.search_profile_id,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=msg_count,
        )
        results.append(resp)
    return results


@router.post("/sessions", response_model=ChatSessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_session(payload: ChatSessionCreate, db: Session = Depends(get_db)):
    """Create a new chat session, optionally processing an initial query"""
    title = payload.title or "New Job Search Chat"
    session = ChatSession(
        title=title,
        search_criteria={},
        is_email_subscribed=False,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # If initial message provided, execute agent pipeline immediately
    if payload.initial_message and payload.initial_message.strip():
        await chat_agent_service.process_user_message(session, payload.initial_message.strip(), db)
        db.refresh(session)

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return ChatSessionDetailResponse(
        id=session.id,
        title=session.title,
        search_criteria=session.search_criteria or {},
        is_email_subscribed=session.is_email_subscribed,
        subscriber_email=session.subscriber_email,
        search_profile_id=session.search_profile_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages,
    )


@router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific chat session with its full message history"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found",
        )

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return ChatSessionDetailResponse(
        id=session.id,
        title=session.title,
        search_criteria=session.search_criteria or {},
        is_email_subscribed=session.is_email_subscribed,
        subscriber_email=session.subscriber_email,
        search_profile_id=session.search_profile_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=messages,
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: str, db: Session = Depends(get_db)):
    """Delete a chat session and all its messages"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found",
        )
    db.delete(session)
    db.commit()
    return None


@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
async def send_message(session_id: str, payload: ChatMessageCreate, db: Session = Depends(get_db)):
    """
    Send a candidate message into the chat session.
    Triggers the AI agent to extract intent, execute MCP tools, score jobs,
    and return the assistant response with embedded job cards.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found",
        )

    assistant_msg = await chat_agent_service.process_user_message(
        session=session,
        user_message_text=payload.content.strip(),
        db=db,
    )

    return assistant_msg


@router.post("/sessions/{session_id}/subscribe", response_model=ChatSessionResponse)
def subscribe_to_email_digest(session_id: str, payload: ChatSubscribeRequest, db: Session = Depends(get_db)):
    """
    One-click subscribe to daily 9:00 AM job email digests based on this chat's search criteria.
    Hooks directly into the background JobScheduler and EmailReportService.
    """
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found",
        )

    email = payload.email.strip()
    session.is_email_subscribed = True
    session.subscriber_email = email

    # Link or update a SearchProfile so the daily 9:00 AM scheduler automatically includes this query
    criteria = session.search_criteria or {}
    roles = criteria.get("roles", ["Software Engineer"])
    skills = criteria.get("skills", [])
    locations = criteria.get("locations", [])
    workplace = criteria.get("workplace_type", "any")
    companies = criteria.get("companies", ["gitlab", "figma", "stripe"])

    if session.search_profile_id:
        profile = db.query(SearchProfile).filter(SearchProfile.id == session.search_profile_id).first()
        if profile:
            profile.name = f"Daily Digest: {session.title}"
            profile.target_titles = roles
            profile.skills = skills
            profile.preferred_locations = locations
            profile.workplace_preference = workplace
            profile.target_ats_companies = companies
            profile.notification_email = email
            profile.email_digest_enabled = True
            profile.is_active = True
    else:
        profile = SearchProfile(
            name=f"Daily Digest: {session.title}",
            target_titles=roles,
            skills=skills,
            preferred_locations=locations,
            workplace_preference=workplace,
            target_ats_companies=companies,
            notification_email=email,
            email_digest_enabled=True,
            is_active=True,
        )
        db.add(profile)
        db.flush()
        session.search_profile_id = profile.id

    db.commit()
    db.refresh(session)

    msg_count = db.query(func.count(ChatMessage.id)).filter(ChatMessage.session_id == session.id).scalar() or 0
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        search_criteria=session.search_criteria or {},
        is_email_subscribed=session.is_email_subscribed,
        subscriber_email=session.subscriber_email,
        search_profile_id=session.search_profile_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=msg_count,
    )


@router.delete("/sessions/{session_id}/subscribe", response_model=ChatSessionResponse)
def unsubscribe_from_email_digest(session_id: str, db: Session = Depends(get_db)):
    """Unsubscribe this chat session from daily email digests"""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found",
        )

    session.is_email_subscribed = False

    if session.search_profile_id:
        profile = db.query(SearchProfile).filter(SearchProfile.id == session.search_profile_id).first()
        if profile:
            profile.email_digest_enabled = False

    db.commit()
    db.refresh(session)

    msg_count = db.query(func.count(ChatMessage.id)).filter(ChatMessage.session_id == session.id).scalar() or 0
    return ChatSessionResponse(
        id=session.id,
        title=session.title,
        search_criteria=session.search_criteria or {},
        is_email_subscribed=session.is_email_subscribed,
        subscriber_email=session.subscriber_email,
        search_profile_id=session.search_profile_id,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=msg_count,
    )
