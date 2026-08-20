import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Intake from "./pages/Intake";
import QueueRuntime from "./components/QueueRuntime";
import Tracking from "./pages/Tracking";

function Router() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const route = (path: string) => `${base}${path}` || "/";

  return (
    <Switch>
      <Route path={route("/")} component={Home} />
      <Route path={route("/intake")} component={Intake} />
      <Route path={route("/tracking")} component={Tracking} />
      <Route path={route("/404")} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <QueueRuntime />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
