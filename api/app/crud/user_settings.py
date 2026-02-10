"""User settings CRUD helpers"""

from typing import Any, Optional
from sqlalchemy.orm import Session

from app.crud.base import BaseCRUD
from app.models import UserSettings
from app.schemas import UserSettingsCreate, UserSettingsUpdate


class UserSettingsCRUD(BaseCRUD[UserSettings, UserSettingsCreate, UserSettingsUpdate]):
    def get_by_user_id(self, db: Session, user_id: int) -> Optional[UserSettings]:
        """Return the settings row for the given user id."""
        return db.query(UserSettings).filter(UserSettings.user_id == user_id).first()


user_settings_crud = UserSettingsCRUD(UserSettings)
