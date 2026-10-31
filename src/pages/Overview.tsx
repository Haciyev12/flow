import { quickActions, recentProjects, recentActivity } from "../data/sampleData";
import { QuickActionCard } from "../components/QuickActionCard";
import { ProjectCard } from "../components/ProjectCard";
import { ActivityItem } from "../components/ActivityItem";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function currentDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Overview() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-8 py-8 space-y-9">

        {/* Welcome */}
        <div>
          <h2 className="text-[22px] font-semibold text-hi tracking-tight leading-tight">
            {greeting()}, Amal
          </h2>
          <p className="text-[13px] text-lo mt-1">{currentDate()}</p>
          <p className="text-[12px] text-dim mt-0.5">Your workspace is ready.</p>
        </div>

        {/* Quick Actions */}
        <section>
          <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-3">
            Quick Actions
          </p>
          <div className="flex gap-3">
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </div>
        </section>

        {/* Recent Projects */}
        <section>
          <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-3">
            Recent Projects
          </p>
          <div className="bg-card border border-line rounded-xl overflow-hidden">
            {recentProjects.map((project, i) => (
              <div
                key={project.id}
                className={i < recentProjects.length - 1 ? "border-b border-line" : ""}
              >
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </section>

        {/* Activity */}
        <section>
          <p className="text-[11px] font-semibold text-dim uppercase tracking-widest mb-4">
            Recent Activity
          </p>
          <div>
            {recentActivity.map((entry, i) => (
              <ActivityItem
                key={entry.id}
                entry={entry}
                isLast={i === recentActivity.length - 1}
              />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
