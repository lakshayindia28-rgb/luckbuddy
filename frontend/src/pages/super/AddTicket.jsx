import { useParams } from "react-router-dom";
import AddTicket from "../vendor/AddTicket";

/**
 * Super plays game on behalf of vendor
 * URL: /super/add-ticket/:username
 */
export default function SuperAddTicket() {
  const { username } = useParams();

  return <AddTicket forcedVendor={username} />;
}
