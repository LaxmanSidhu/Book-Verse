
const BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHEji0MCywpiCqKw_aMNA2woVKKaU7VnBnbajgUvfU3Z2rIbHQUZghAZ867mXlpyHC-pw9TiSRmLSu/pub?output=csv&gid=";

const SHEETS = {
  siddhesh: {name: "Siddhesh", gid: "0", thumbnail: "assets/sidhu.jpeg", description: "My personal reading collection"},
  pratiksha: {name: "Pratiksha", gid: "1145659502", thumbnail: "assets/pratu.jpeg", description: "Pratiksha's curated book list"},
  dhanashri: { name: "Dhanashri", gid: "679217924", thumbnail: "assets/dhanu.jpeg", description: "Dhanashri's reading journey"},
  read_list: { name: "Read List", gid: "798459865", thumbnail: "https://images.theconversation.com/files/45159/original/rptgtpxd-1396254731.jpg?ixlib=rb-4.1.0&q=45&auto=format&w=1356&h=668&fit=crop", description: "Our upcoming books to read" }
};

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_tz1g2pt';
const EMAILJS_TEMPLATE_ID = 'template_o8tec9p';
const EMAILJS_PUBLIC_KEY = 'UFj38gwbmlz4eqVpC';

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BASE_URL, SHEETS, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY };
}
