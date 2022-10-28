const API = "https://api.opendota.com/api";

const app = new Vue({
  el: '#app',
  data() {
    return {
      playerId: "",
      numMatches: 100,
      matches: [],
      heroes: [],
      loading: false,
      parsing: false,
      done: false,
      currentRequest: 0,
      parseTaskId: -1,
    };
  },
  async created() {
    const [_, queryId] = location.search.split("id=");
    if (queryId) {
      this.playerId = queryId;
    }
    const response = await axios.get(`${API}/heroes`); 
    this.heroes = response.data || [];
  },
  methods: {
    async getMatches() {
      try {
        this.done = false;
        this.loading = true;
        const response = await axios.get(`${API}/players/${this.playerId}/matches?limit=${this.numMatches}`);
        this.matches = response.data || [];
      } catch (error) {
        alert("Failed. Please try again.");
      } finally {
        this.loading = false;
      }
    },
    async requestParse() {
      this.loading = true;
      this.parsing = true;
      this.currentRequest = 0;
      this.parseTaskId = setInterval(async () => {
        let currentMatch;

        do {
          currentMatch = this.matches[this.currentRequest];
          this.currentRequest++;

          if(this.currentRequest > this.matches.length) {
            console.log("JOB END");
            this.loading = false;
            this.parsing = false;
            this.done = true;
            clearInterval(this.parseTaskId);
            return;
          }

          console.log("Parsing", this.currentRequest, currentMatch);
          if(currentMatch.version != null) {
            this.$set(currentMatch, "_status", "OK");
          }

        } while(currentMatch.version != null);

        try {
          await axios.post(`${API}/request/${currentMatch.match_id}`);
          this.$set(currentMatch, "_status", "Requested");
        } catch (error) {
          console.log("ERROR DETAILS", error);
          if(error && error.response && error.response.status) {
            this.$set(currentMatch, "_status", `Error (${error.response.status})`);
          } else {
            this.$set(currentMatch, "_status", "Error (-1)");
          }
        }

      }, 1000);
    },
    getHeroName(heroId) {
      if(this.heroes.length) {
        return this.heroes.find(x => x.id === heroId).localized_name;
      } else {
        return `Loading... (hero_${heroId})`;
      }
    },
    getMatchClass(match) {
      if(match.version != null) {
        return "parsed";
      } else {
        if(match._status === "Requested") {
          return "requested";
        } else {
          return "not-parsed";
        }
      }
    },
    getMatchResult(match) {
      if(match.leaver_status !== 0) {
        return "Abandoned";
      } else if(match.player_slot < 100 && match.radiant_win) {
        return "Won";
      } else if(match.player_slot > 100 && !match.radiant_win) {
        return "Won";
      } else {
        return "Lost";
      }
    },
    getMatchDate(match) {
      return getRelativeTime(new Date(match.start_time * 1000));
    }
  }
});

var units = {
  year  : 24 * 60 * 60 * 1000 * 365,
  month : 24 * 60 * 60 * 1000 * 365/12,
  day   : 24 * 60 * 60 * 1000,
  hour  : 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000
}

var rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

// From: https://stackoverflow.com/a/53800501/2346767
function getRelativeTime(d1, d2 = new Date()) {
  var elapsed = d1 - d2;
  for (var u in units) {
    if (Math.abs(elapsed) > units[u] || u == 'second') {
      return rtf.format(Math.round(elapsed/units[u]), u)
    }
  }
}