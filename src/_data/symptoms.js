import { getSymptoms } from "../../lib/content.js";

// All rows from the Airtable "Symptoms" table (one page is generated per row).
export default () => getSymptoms();
