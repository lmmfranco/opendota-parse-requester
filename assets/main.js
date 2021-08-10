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
    }
  }
});