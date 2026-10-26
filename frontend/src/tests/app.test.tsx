import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../app/App";
import { useStudio } from "../stores/studio";
vi.mock("../hooks/useStream", () => ({ useStream: () => {} }));
vi.mock("../scene/WarehouseScene", () => ({
  default: () => <div>Authoritative scene connected</div>,
}));
const world = {
  id: "warehouse-v1",
  width: 20,
  height: 16,
  stations: { A: [2, 12] },
  shelves: [],
  restricted: [],
  corridor_b: [],
};
const mission = {
  id: "m1",
  task: {
    intent: "navigate",
    objective: "Navigate to Station C",
    source: null,
    destinations: ["C"],
    constraints: ["Refuse collisions"],
    actions: [{ kind: "navigate", station: "C", quantity: 0 }],
    parser: "LOCAL",
    environment_id: "warehouse-v1",
  },
  scenario: "clear",
  status: "ready",
  position: [2, 12],
  heading: 0,
  velocity: 0,
  cargo: 0,
  delivered: {},
  action_index: 0,
  path: [
    [2, 11],
    [2, 10],
    [2, 9],
    [2, 8],
  ],
  executed: [[2, 12]],
  obstacles: [],
  evidence: [],
  conflicts: [],
  events: [],
  verified: false,
  error: null,
  memory_ids: [],
  metrics: {
    time: 0,
    distance: 0,
    replans: 0,
    collisions: 0,
    prevented: 0,
    decision_ms: 0,
  },
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  useStudio.setState({ mission: null, connected: true });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, opts?: RequestInit) => {
      const path = String(url);
      const body = path.endsWith("/explanation")
        ? { decisions: [] }
        : path.endsWith("/world")
          ? world
          : path.endsWith("/missions")
            ? mission
            : path.endsWith("/obstacles")
              ? mission
              : path.includes("/control/start")
                ? { ...mission, status: "running" }
                : path.includes("/control/pause")
                  ? { ...mission, status: "paused" }
                  : path.includes("/control/stop")
                    ? { ...mission, status: "stopped" }
                    : path.includes("/control/reset")
                      ? null
                      : [];
      if (
        path.endsWith("/missions") &&
        opts?.body &&
        String(opts.body).includes("Unknown")
      )
        return { ok: false, json: async () => ({ detail: "Unknown station" }) };
      return { ok: true, json: async () => body };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Studio workflow", () => {
  it("renders the studio and connected scene", async () => {
    mount();
    expect(
      screen.getByRole("heading", { name: /From intent/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Authoritative scene connected"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("LOCAL constrained parser · No AI inference"),
    ).toBeInTheDocument();
  });
  it("submits the actual prompt, previews and runs a plan", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Mission prompt"), {
      target: { value: "Navigate to Station C" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Generate mission plan/ }),
    );
    await waitFor(() =>
      expect(screen.getByText("TASK INTERPRETATION")).toBeInTheDocument(),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/missions",
      expect.objectContaining({
        body: JSON.stringify({
          prompt: "Navigate to Station C",
          scenario: "conflict",
          speed: 2.4,
        }),
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    await waitFor(() =>
      expect(useStudio.getState().mission?.status).toBe("running"),
    );
    fireEvent.click(screen.getByLabelText("Pause mission"));
    await waitFor(() =>
      expect(useStudio.getState().mission?.status).toBe("paused"),
    );
    fireEvent.click(screen.getByLabelText("Emergency stop"));
    await waitFor(() =>
      expect(useStudio.getState().mission?.status).toBe("stopped"),
    );
    fireEvent.click(screen.getByLabelText("Reset mission"));
    await waitFor(() => expect(useStudio.getState().mission).toBeNull());
  });
  it("shows unsupported task errors", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Mission prompt"), {
      target: { value: "Unknown" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Generate mission plan/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unknown station",
    );
  });
  it("routes explicit explanation and obstacle commands to actual functionality", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Mission prompt"), {
      target: { value: "Navigate to Station C" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Generate mission plan/ }),
    );
    await waitFor(() =>
      expect(screen.getByText("TASK INTERPRETATION")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText("Mission prompt"), {
      target: { value: "Place an obstacle in front of the robot." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit command" }));
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/obstacles",
        expect.objectContaining({ body: JSON.stringify({ x: 2, y: 9 }) }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Mission prompt"), {
      target: { value: "Explain this mission." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit command" }));
    expect(
      await screen.findByRole("heading", { name: "Decision intelligence." }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/explanation", expect.anything()),
    );
  });
  it("navigates every workspace", async () => {
    mount();
    for (const [name, title] of [
      ["Intelligence", "Decision intelligence."],
      ["Evidence", "Evidence ledger."],
      ["Memory", "Operational memory."],
      ["Experiments", "Training laboratory."],
      ["Research", "Reliability, with receipts."],
      ["Settings", "Connected intelligence."],
    ]) {
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp("^" + name) }),
      );
      expect(
        await screen.findByRole("heading", { name: title }),
      ).toBeInTheDocument();
    }
  });
});
