import { data } from "@/lib/data";
import Dashboard from "./components/Dashboard";

export default function Page() {
  return <Dashboard data={data} />;
}
