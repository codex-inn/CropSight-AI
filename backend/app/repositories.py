from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RepositoryInterfaces:
    """Placeholder repository interfaces for future persistence integration.

    Frontend currently persists fields/scans locally. Replace this with SQLModel or SQLAlchemy
    repositories for users, fields, scans, and detections when backend persistence is added.
    """

    users: str = 'not-configured'
    fields: str = 'not-configured'
    scans: str = 'not-configured'
    detections: str = 'not-configured'


repositories = RepositoryInterfaces()
