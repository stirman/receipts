# NBA Data Sources for Verification

## Primary Sources

### 1. NBA Stats API (stats.nba.com)

**Base URL:** `https://stats.nba.com/stats/`

**Key Endpoints:**

| Endpoint | Use Case | Example |
|----------|----------|---------|
| `leaguestandings` | Playoff verification | Who made playoffs |
| `leagueleaders` | PPG, RPG, APG leaders | Stat averages |
| `playergamelog` | Game-by-game stats | Specific performances |
| `scoreboard` | Game results | Win/loss verification |
| `commonplayerinfo` | Player details | Team, position |
| `teamgamelog` | Team game history | Win totals |

**Example Request:**
```bash
curl "https://stats.nba.com/stats/leaguestandings?LeagueID=00&Season=2025-26&SeasonType=Regular+Season"
```

**Headers Required:**
```
User-Agent: Mozilla/5.0
Referer: https://www.nba.com/
```

**Rate Limits:** Unofficial API, be respectful (~1 req/sec)

---

### 2. Basketball Reference

**URL:** `https://www.basketball-reference.com/`

**Best For:**
- Historical data
- Advanced stats
- Career totals
- All-time records

**Access Method:** Web scraping (no official API)

**Key Pages:**
- `/leagues/NBA_2026.html` — Season overview
- `/teams/HOU/2026.html` — Team page
- `/players/g/greenja05.html` — Player page

---

### 3. ESPN API (Unofficial)

**Base URL:** `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/`

**Endpoints:**
- `scoreboard` — Today's games
- `teams` — All teams
- `teams/{id}/roster` — Team roster

---

## Verification Logic by Take Type

### Playoff Takes
```
"[Team] will make the playoffs"
```
**Data Source:** `leaguestandings` endpoint
**Resolution:** End of regular season
**Condition:** Team rank ≤ 10 (play-in) or ≤ 6 (direct)

### Win Total Takes
```
"[Team] will win [X]+ games"
```
**Data Source:** `teamgamelog` endpoint
**Resolution:** End of regular season
**Condition:** Sum of wins ≥ X

### Player Stat Average Takes
```
"[Player] will average [X]+ PPG/RPG/APG"
```
**Data Source:** `leagueleaders` or player stats endpoint
**Resolution:** End of regular season
**Condition:** Season average ≥ X

### Championship Takes
```
"[Team] will win the championship"
```
**Data Source:** Playoff bracket / finals results
**Resolution:** After NBA Finals
**Condition:** Team wins 4 games in Finals

### All-Star Takes
```
"[Player] will be an All-Star"
```
**Data Source:** All-Star roster announcements
**Resolution:** All-Star weekend (mid-February)
**Condition:** Player on All-Star roster

### Award Takes
```
"[Player] will win MVP/DPOY/ROY/etc"
```
**Data Source:** Award announcements
**Resolution:** End of season awards
**Condition:** Player wins award

---

## Data Refresh Strategy

| Data Type | Refresh Frequency |
|-----------|-------------------|
| Live scores | Every 30 seconds during games |
| Standings | Every hour |
| Player stats | Daily |
| Playoff bracket | After each game |
| Awards | On announcement |

---

## Sample Take → Verification Mapping

```json
{
  "take": "Rockets will make the playoffs this season",
  "verification": {
    "type": "playoff_qualification",
    "team": "HOU",
    "season": "2025-26",
    "data_source": "nba_standings",
    "resolution_trigger": "season_end",
    "condition": {
      "field": "PlayoffRank",
      "operator": "<=",
      "value": 10
    }
  }
}
```

```json
{
  "take": "Jalen Green will average 25+ PPG",
  "verification": {
    "type": "player_stat_average",
    "player_id": "1630224",
    "player_name": "Jalen Green",
    "stat": "PTS",
    "threshold": 25.0,
    "season": "2025-26",
    "data_source": "nba_player_stats",
    "resolution_trigger": "season_end",
    "condition": {
      "field": "PTS",
      "operator": ">=",
      "value": 25.0
    }
  }
}
```

---

## Team IDs Reference

| Team | NBA ID | Abbreviation |
|------|--------|--------------|
| Atlanta Hawks | 1610612737 | ATL |
| Boston Celtics | 1610612738 | BOS |
| Brooklyn Nets | 1610612751 | BKN |
| Charlotte Hornets | 1610612766 | CHA |
| Chicago Bulls | 1610612741 | CHI |
| Cleveland Cavaliers | 1610612739 | CLE |
| Dallas Mavericks | 1610612742 | DAL |
| Denver Nuggets | 1610612743 | DEN |
| Detroit Pistons | 1610612765 | DET |
| Golden State Warriors | 1610612744 | GSW |
| Houston Rockets | 1610612745 | HOU |
| Indiana Pacers | 1610612754 | IND |
| LA Clippers | 1610612746 | LAC |
| Los Angeles Lakers | 1610612747 | LAL |
| Memphis Grizzlies | 1610612763 | MEM |
| Miami Heat | 1610612748 | MIA |
| Milwaukee Bucks | 1610612749 | MIL |
| Minnesota Timberwolves | 1610612750 | MIN |
| New Orleans Pelicans | 1610612740 | NOP |
| New York Knicks | 1610612752 | NYK |
| Oklahoma City Thunder | 1610612760 | OKC |
| Orlando Magic | 1610612753 | ORL |
| Philadelphia 76ers | 1610612755 | PHI |
| Phoenix Suns | 1610612756 | PHX |
| Portland Trail Blazers | 1610612757 | POR |
| Sacramento Kings | 1610612758 | SAC |
| San Antonio Spurs | 1610612759 | SAS |
| Toronto Raptors | 1610612761 | TOR |
| Utah Jazz | 1610612762 | UTA |
| Washington Wizards | 1610612764 | WAS |
