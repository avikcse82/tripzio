"""Traveller-local date handling.

Tripzio serves India only, but the servers run UTC. Between 00:00 and 05:29
IST the server's own `date.today()` is a calendar day BEHIND the traveller,
which is long enough to matter: the trip companion showed day 3 to someone
opening it over early breakfast on day 4, and showed nothing at all to
someone opening it just after midnight on their first night, because the
server still believed the trip hadn't started.

Anything deciding "what day is it for the traveller" must use today_ist().
This lives in core/ rather than beside its first caller so that routers can
share it without importing each other — routers/share.py already imports
routers/trips.py, so a date helper parked in either one cannot be used by
the other.
"""

from datetime import date, datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    """Current calendar date in India, independent of server timezone."""
    return datetime.now(IST).date()
