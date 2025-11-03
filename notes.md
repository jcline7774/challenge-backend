###Performance
-getEventsByUserId does linear search each time -> 0(n)
-no caching or indexing

###resilience
-addEvent directly calls external API w/o retry control
-When external API fails, system continues to hammer away
-no circuit breaker pattern
-no fallback mech
-no rate limit

### Production Readiness
-No test or lint scripts
-README empty

