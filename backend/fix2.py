import os

def fix_file(path, new_header_lines):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by the logger line, which is usually right below the imports
    parts = content.split('logger = logging.getLogger(__name__)')
    if len(parts) > 1:
        new_content = new_header_lines.strip() + "\n\nlogger = logging.getLogger(__name__)" + parts[1]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {path}")
    else:
        print(f"Could not find logger line in {path}")


looks_header = """
\"\"\"
Look views: feed, comments, likes, reports, blocks.
\"\"\"
import logging

from django.db import IntegrityError
from django.db.models import Exists, F, OuterRef, Q, Value, Subquery
from django.contrib.contenttypes.models import ContentType
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import CursorPagination
from apps.common.permissions import IsAuthenticatedOrReadOnly
from apps.common.throttling import PostingThrottle, ReportThrottle
from apps.planner.models import CollectionItem

from .models import Block, CommentLike, Look, LookComment, LookLike, Report, Style
from .serializers import (
    CommentSerializer,
    LookDraftSerializer,
    LookSerializer,
    ReportSerializer,
    StyleSerializer,
)
"""

planner_header = """
\"\"\"
Planner views: Collections and Care Plans.
\"\"\"
import logging

from django.db import IntegrityError, transaction
from django.db.models import Count, F
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import CursorPagination
from apps.looks.models import Look
from apps.shelf.models import Product

from .models import CarePlan, CarePlanSession, CarePlanStep, Collection, CollectionItem
from .serializers import (
    CarePlanDraftSerializer,
    CarePlanSerializer,
    CarePlanSessionDraftSerializer,
    CarePlanSessionSerializer,
    CollectionItemDraftSerializer,
    CollectionItemSerializer,
    CollectionSerializer,
)
"""

bookings_header = """
\"\"\"
Booking endpoints.
\"\"\"
import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import F, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsPhoneVerified
from apps.stylists.models import MenuItem, StylistProfile

from .models import Booking, CheckIn, Review, ReviewReport, SlotInterest
from .serializers import (
    BookingSerializer,
    CheckInSerializer,
    ReviewSerializer,
    SlotInterestSerializer,
)
from .state_machine import can_transition, determine_cancel_type, validate_close_out
from .tasks import release_slots_to_waitlist
"""

profiles_header = """
\"\"\"
User profile and analytics views.
\"\"\"
import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer
from apps.bookings.models import Booking

from .models import AnalyticsEvent, ConsentRecord, HairProfile, HairProfileSnapshot, Profile
from .serializers import (
    ConsentBatchSerializer,
    EventBatchSerializer,
    HairProfileSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
)
from .tasks import generate_data_export
"""

shelf_header = """
\"\"\"
Shelf views: Product catalogue and personal shelf.
\"\"\"
import logging

from django.contrib.postgres.search import SearchQuery
from django.db import IntegrityError
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import CursorPagination
from apps.profiles.models import HairProfile

from .models import Product, ShelfItem
from .serializers import ProductSerializer, ShelfItemSerializer, ShelfItemUpdateSerializer
"""

stylists_header = """
\"\"\"
Stylist views.
\"\"\"
import logging
import uuid

from django.db import IntegrityError, transaction
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import NoPagination
from apps.common.permissions import IsPhoneVerified, IsStylist
from apps.bookings.models import Review
from apps.looks.models import Block, Look, Style

from .models import MenuItem, NOT_HANDLES, PageView, PaymentMethod, PortfolioPhoto, StylistProfile
from .serializers import (
    HandleCheckSerializer,
    MenuItemDraftSerializer,
    MenuItemSerializer,
    PortfolioPhotoSerializer,
    StylistPageSerializer,
    StylistProfileDraftSerializer,
    StylistProfileSerializer,
)
from .slots import compute_free_slots
"""

content_header = """
\"\"\"
Content views: Education library.
\"\"\"
import logging

from django.db.models import Q
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import CursorPagination
from apps.profiles.models import HairProfile

from .models import ContentItem
from .serializers import ContentItemSerializer
"""

base = r"c:\Users\yawop\Downloads\Coding\Kalon\backend"
fix_file(f"{base}/apps/looks/views.py", looks_header)
fix_file(f"{base}/apps/planner/views.py", planner_header)
fix_file(f"{base}/apps/bookings/views.py", bookings_header)
fix_file(f"{base}/apps/profiles/views.py", profiles_header)
fix_file(f"{base}/apps/shelf/views.py", shelf_header)
fix_file(f"{base}/apps/stylists/views.py", stylists_header)
fix_file(f"{base}/apps/content/views.py", content_header)

