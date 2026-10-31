import { ArrowUpRight } from "lucide-react";
import type { Project } from "../types";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-hover transition-colors duration-100 cursor-default group">
      <div
        className="w-[7px] h-[7px] rounded-full shrink-0 mt-px"
        style={{ backgroundColor: project.dotColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-hi">{project.name}</span>
          <div className="flex gap-1">
            {project.tech.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-[1px] rounded bg-elevated text-dim font-mono"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <p className="text-[12px] text-lo truncate mt-0.5">{project.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] text-dim">{project.lastOpened}</span>
        <ArrowUpRight
          size={12}
          strokeWidth={1.8}
          className="text-dim opacity-0 group-hover:opacity-100 transition-opacity duration-100"
        />
      </div>
    </div>
  );
}
