from app.crud.votuna_playlist_member import votuna_playlist_member_crud
from app.crud.votuna_playlist_settings import votuna_playlist_settings_crud
from app.crud.votuna_track_suggestion import votuna_track_suggestion_crud
from app.crud.votuna_track_vote import votuna_track_vote_crud
from app.auth.dependencies import get_current_user, get_optional_current_user
from app.services.music_providers import ProviderAPIError, ProviderAuthError
from main import app


def _set_known_members(db_session, playlist, owner_user_id: int, member_user_ids: list[int]) -> None:
    keep_user_ids = {owner_user_id, *member_user_ids}
    for membership, _user in votuna_playlist_member_crud.list_members(db_session, playlist.id):
        if membership.user_id in keep_user_ids:
            continue
        db_session.delete(membership)
    db_session.commit()

    for member_user_id in member_user_ids:
        if votuna_playlist_member_crud.get_member(db_session, playlist.id, member_user_id):
            continue
        votuna_playlist_member_crud.create(
            db_session,
            {
                "playlist_id": playlist.id,
                "user_id": member_user_id,
                "role": "member",
            },
        )


def _client_as(client, acting_user):
    app.dependency_overrides[get_current_user] = lambda: acting_user
    app.dependency_overrides[get_optional_current_user] = lambda: acting_user
    return client


def test_create_and_list_suggestions(auth_client, votuna_playlist, provider_stub):
    payload = {
        "provider_track_id": "track-100",
        "track_title": "Test Track",
        "track_artist": "Artist",
        "track_url": "https://soundcloud.com/test/track-100",
    }
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json=payload,
    )
    assert response.status_code == 200
    suggestion = response.json()
    assert suggestion["provider_track_id"] == "track-100"
    assert suggestion["upvote_count"] == 1
    assert suggestion["downvote_count"] == 0
    assert suggestion["my_reaction"] == "up"
    assert suggestion["collaborators_left_to_vote_count"] == 1
    assert suggestion["status"] == "pending"

    list_response = auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        params={"status": "pending"},
    )
    assert list_response.status_code == 200
    data = list_response.json()
    assert any(item["id"] == suggestion["id"] for item in data)


def test_search_tracks_for_suggestions(auth_client, votuna_playlist, provider_stub):
    response = auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/tracks/search",
        params={"q": "house", "limit": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["provider_track_id"] == "track-search-1"


def test_search_tracks_for_suggestions_whitespace_query_returns_400(
    auth_client,
    votuna_playlist,
    provider_stub,
):
    response = auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/tracks/search",
        params={"q": "   "},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Search query is required"


def test_search_tracks_for_suggestions_provider_auth_owner_returns_401(
    auth_client,
    votuna_playlist,
    provider_stub,
    monkeypatch,
):
    async def _raise_auth_error(self, query: str, limit: int = 10):
        raise ProviderAuthError("expired")

    monkeypatch.setattr(provider_stub, "search_tracks", _raise_auth_error)
    response = auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/tracks/search",
        params={"q": "house"},
    )
    assert response.status_code == 401


def test_search_tracks_for_suggestions_provider_auth_member_returns_409(
    other_auth_client,
    db_session,
    votuna_playlist,
    other_user,
    provider_stub,
    monkeypatch,
):
    votuna_playlist_member_crud.create(
        db_session,
        {"playlist_id": votuna_playlist.id, "user_id": other_user.id, "role": "member"},
    )

    async def _raise_auth_error(self, query: str, limit: int = 10):
        raise ProviderAuthError("expired")

    monkeypatch.setattr(provider_stub, "search_tracks", _raise_auth_error)
    response = other_auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/tracks/search",
        params={"q": "house"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Playlist owner must reconnect SoundCloud"


def test_search_tracks_for_suggestions_provider_api_error_returns_502(
    auth_client,
    votuna_playlist,
    provider_stub,
    monkeypatch,
):
    async def _raise_provider_error(self, query: str, limit: int = 10):
        raise ProviderAPIError("provider unavailable")

    monkeypatch.setattr(provider_stub, "search_tracks", _raise_provider_error)
    response = auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/tracks/search",
        params={"q": "house"},
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "provider unavailable"


def test_search_tracks_for_suggestions_requires_member(other_auth_client, votuna_playlist):
    response = other_auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/tracks/search",
        params={"q": "house"},
    )
    assert response.status_code == 403


def test_list_suggestions_with_status_filter(auth_client, db_session, votuna_playlist, user):
    pending = votuna_track_suggestion_crud.create(
        db_session,
        {
            "playlist_id": votuna_playlist.id,
            "provider_track_id": "track-pending",
            "track_title": "Pending",
            "suggested_by_user_id": user.id,
            "status": "pending",
        },
    )
    accepted = votuna_track_suggestion_crud.create(
        db_session,
        {
            "playlist_id": votuna_playlist.id,
            "provider_track_id": "track-accepted",
            "track_title": "Accepted",
            "suggested_by_user_id": user.id,
            "status": "accepted",
        },
    )

    response = auth_client.get(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        params={"status": "accepted"},
    )
    assert response.status_code == 200
    data = response.json()
    ids = {item["id"] for item in data}
    assert accepted.id in ids
    assert pending.id not in ids
    assert all(item["status"] == "accepted" for item in data)


def test_create_suggestion_from_track_url_resolves_metadata(auth_client, votuna_playlist, provider_stub):
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"track_url": "https://soundcloud.com/test/resolved-track"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider_track_id"] == "track-resolved-1"
    assert data["track_title"] == "Resolved Track"
    assert data["track_artist"] == "Resolved Artist"
    assert data["track_url"] == "https://soundcloud.com/test/resolved-track"


def test_create_suggestion_with_track_id_and_url_does_not_resolve_url(
    auth_client,
    votuna_playlist,
    provider_stub,
    monkeypatch,
):
    call_count = {"resolve_track_url": 0}

    async def _track_resolve_calls(self, url: str):
        call_count["resolve_track_url"] += 1
        return self.resolved_track

    monkeypatch.setattr(provider_stub, "resolve_track_url", _track_resolve_calls)
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={
            "provider_track_id": "track-direct",
            "track_url": "https://soundcloud.com/test/ignored-for-resolve",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider_track_id"] == "track-direct"
    assert data["track_url"] == "https://soundcloud.com/test/ignored-for-resolve"
    assert call_count["resolve_track_url"] == 0


def test_create_suggestion_requires_track_id_or_url(auth_client, votuna_playlist, provider_stub):
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"track_title": "Missing ID"},
    )
    assert response.status_code == 400


def test_create_suggestion_invalid_track_url_returns_400(auth_client, votuna_playlist, provider_stub):
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"track_url": "https://soundcloud.com/test/not-a-track"},
    )
    assert response.status_code == 400


def test_create_suggestion_url_resolve_non_4xx_provider_error_returns_502(
    auth_client,
    votuna_playlist,
    provider_stub,
    monkeypatch,
):
    async def _raise_provider_error(self, url: str):
        raise ProviderAPIError("provider unavailable", status_code=500)

    monkeypatch.setattr(provider_stub, "resolve_track_url", _raise_provider_error)
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"track_url": "https://soundcloud.com/test/server-error-track"},
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "provider unavailable"


def test_duplicate_suggestion_from_second_member_resolves(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])

    create_response = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-dup"},
    )
    assert create_response.status_code == 200
    assert create_response.json()["status"] == "pending"

    response = _client_as(client, other_user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-dup"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["upvote_count"] == 2
    assert data["downvote_count"] == 0
    assert data["status"] == "accepted"
    assert data["resolution_reason"] == "threshold_met"


def test_duplicate_suggestion_by_same_user_is_idempotent(
    auth_client,
    db_session,
    votuna_playlist,
    user,
    provider_stub,
):
    suggestion = votuna_track_suggestion_crud.create(
        db_session,
        {
            "playlist_id": votuna_playlist.id,
            "provider_track_id": "track-same-user-dup",
            "track_title": "Dup Track",
            "suggested_by_user_id": user.id,
            "status": "pending",
        },
    )
    votuna_track_vote_crud.set_reaction(
        db_session,
        suggestion.id,
        user.id,
        "up",
    )

    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-same-user-dup"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == suggestion.id
    assert data["upvote_count"] == 1
    assert data["downvote_count"] == 0
    counts = votuna_track_vote_crud.count_reactions(db_session, suggestion.id)
    assert counts["total"] == 1


def test_track_already_in_provider_returns_conflict(
    auth_client,
    votuna_playlist,
    provider_stub,
    monkeypatch,
):
    monkeypatch.setattr(provider_stub, "track_exists_value", True)
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-existing"},
    )
    assert response.status_code == 409


def test_provider_check_error_still_creates_suggestion(
    auth_client,
    votuna_playlist,
    provider_stub,
    monkeypatch,
):
    async def _raise_provider_error(self, provider_playlist_id: str, track_id: str):
        raise ProviderAPIError("provider unavailable")

    monkeypatch.setattr(provider_stub, "track_exists", _raise_provider_error)
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-api-error"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["provider_track_id"] == "track-api-error"
    assert data["upvote_count"] == 1


def test_reaction_endpoint_not_found_returns_404(auth_client):
    response = auth_client.put(
        "/api/v1/votuna/suggestions/999999/reaction",
        json={"reaction": "up"},
    )
    assert response.status_code == 404


def test_reaction_non_member_forbidden(
    other_auth_client,
    db_session,
    votuna_playlist,
    user,
):
    suggestion = votuna_track_suggestion_crud.create(
        db_session,
        {
            "playlist_id": votuna_playlist.id,
            "provider_track_id": "track-non-member-vote",
            "track_title": "Non Member Vote",
            "suggested_by_user_id": user.id,
            "status": "pending",
        },
    )

    response = other_auth_client.put(
        f"/api/v1/votuna/suggestions/{suggestion.id}/reaction",
        json={"reaction": "up"},
    )
    assert response.status_code == 403


def test_reaction_toggle_same_value_removes_reaction(auth_client, votuna_playlist, provider_stub):
    create_response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-repeat-reaction"},
    )
    assert create_response.status_code == 200
    suggestion_id = create_response.json()["id"]

    down_response = auth_client.put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert down_response.status_code == 200
    assert down_response.json()["downvote_count"] == 1

    toggle_off = auth_client.put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert toggle_off.status_code == 200
    data = toggle_off.json()
    assert data["upvote_count"] == 0
    assert data["downvote_count"] == 0
    assert data["my_reaction"] is None


def test_tie_mode_add_accepts(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])
    create_response = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-tie-add"},
    )
    suggestion_id = create_response.json()["id"]

    vote_response = _client_as(client, other_user).put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert vote_response.status_code == 200
    data = vote_response.json()
    assert data["status"] == "accepted"
    assert data["resolution_reason"] == "tie_add"


def test_tie_mode_reject_rejects(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])
    settings = votuna_playlist_settings_crud.get_by_playlist_id(db_session, votuna_playlist.id)
    votuna_playlist_settings_crud.update(
        db_session,
        settings,
        {"tie_break_mode": "reject"},
    )

    create_response = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-tie-reject"},
    )
    suggestion_id = create_response.json()["id"]

    vote_response = _client_as(client, other_user).put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert vote_response.status_code == 200
    data = vote_response.json()
    assert data["status"] == "rejected"
    assert data["resolution_reason"] == "tie_reject"


def test_threshold_not_met_rejects(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])
    create_response = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-threshold-reject"},
    )
    suggestion_id = create_response.json()["id"]

    owner_down = _client_as(client, user).put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert owner_down.status_code == 200
    assert owner_down.json()["status"] == "pending"

    member_down = _client_as(client, other_user).put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert member_down.status_code == 200
    data = member_down.json()
    assert data["status"] == "rejected"
    assert data["resolution_reason"] == "threshold_not_met"


def test_cancel_permissions_and_reasons(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])

    by_member = _client_as(client, other_user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-cancel-member"},
    )
    suggestion_id = by_member.json()["id"]

    cancel_by_suggester = _client_as(client, other_user).post(
        f"/api/v1/votuna/suggestions/{suggestion_id}/cancel",
    )
    assert cancel_by_suggester.status_code == 200
    assert cancel_by_suggester.json()["resolution_reason"] == "canceled_by_suggester"

    by_member_again = _client_as(client, other_user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-cancel-owner"},
    )
    suggestion_owner_cancel = by_member_again.json()["id"]
    cancel_by_owner = _client_as(client, user).post(
        f"/api/v1/votuna/suggestions/{suggestion_owner_cancel}/cancel",
    )
    assert cancel_by_owner.status_code == 200
    assert cancel_by_owner.json()["resolution_reason"] == "canceled_by_owner"

    owner_suggestion = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-cancel-forbidden"},
    )
    forbidden_id = owner_suggestion.json()["id"]
    forbidden_cancel = _client_as(client, other_user).post(
        f"/api/v1/votuna/suggestions/{forbidden_id}/cancel",
    )
    assert forbidden_cancel.status_code == 403


def test_force_add_permissions(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])

    suggestion = _client_as(client, other_user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-force-add"},
    )
    suggestion_id = suggestion.json()["id"]

    force_add = _client_as(client, user).post(f"/api/v1/votuna/suggestions/{suggestion_id}/force-add")
    assert force_add.status_code == 200
    assert force_add.json()["status"] == "accepted"
    assert force_add.json()["resolution_reason"] == "force_add"

    owner_suggestion = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-force-add-forbidden"},
    )
    forbidden_id = owner_suggestion.json()["id"]
    forbidden_force = _client_as(client, other_user).post(
        f"/api/v1/votuna/suggestions/{forbidden_id}/force-add",
    )
    assert forbidden_force.status_code == 403


def test_resuggest_rejected_track_requires_override(
    client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])

    created = _client_as(client, other_user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-resuggest"},
    )
    suggestion_id = created.json()["id"]

    _client_as(client, other_user).put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    rejected = _client_as(client, user).put(
        f"/api/v1/votuna/suggestions/{suggestion_id}/reaction",
        json={"reaction": "down"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    blocked = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-resuggest"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["code"] == "TRACK_PREVIOUSLY_REJECTED"

    allowed = _client_as(client, user).post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-resuggest", "allow_resuggest": True},
    )
    assert allowed.status_code == 200
    assert allowed.json()["status"] == "pending"


def test_collaborators_left_to_vote_names(
    auth_client,
    db_session,
    votuna_playlist,
    user,
    other_user,
    provider_stub,
):
    _set_known_members(db_session, votuna_playlist, user.id, [other_user.id])
    response = auth_client.post(
        f"/api/v1/votuna/playlists/{votuna_playlist.id}/suggestions",
        json={"provider_track_id": "track-left-to-vote"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["collaborators_left_to_vote_count"] == 1
    assert data["collaborators_left_to_vote_names"] == [other_user.display_name]
