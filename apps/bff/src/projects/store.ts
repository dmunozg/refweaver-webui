import { and, desc, eq, isNull } from "drizzle-orm";
import { projects } from "@refweaver/db";
import type { Database } from "@refweaver/db";
import type { CreateProjectInput, ProjectRecord, ProjectStore } from "./types";

function castProjects(rows: Array<Record<string, unknown>>): ProjectRecord[] {
  return rows as ProjectRecord[];
}

export function createProjectStore(db: Database): ProjectStore {
  return {
    async createProject(input: CreateProjectInput) {
      const [row] = castProjects(
        await db.insert(projects).values({
          name: input.name,
          ownerUserId: input.ownerUserId,
          teamId: null
        }).returning()
      );

      return row;
    },

    async listProjects(ownerUserId: string, includeDeleted: boolean) {
      const conditions = [eq(projects.ownerUserId, ownerUserId)];
      if (!includeDeleted) {
        conditions.push(isNull(projects.deletedAt));
      }

      const rows = await db
        .select()
        .from(projects)
        .where(and(...conditions))
        .orderBy(desc(projects.updatedAt));

      return castProjects(rows);
    },

    async getProjectById(ownerUserId: string, projectId: string, includeDeleted: boolean) {
      const conditions = [eq(projects.ownerUserId, ownerUserId), eq(projects.id, projectId)];
      if (!includeDeleted) {
        conditions.push(isNull(projects.deletedAt));
      }

      const [row] = castProjects(
        await db
          .select()
          .from(projects)
          .where(and(...conditions))
          .limit(1)
      );

      return row ?? null;
    },

    async updateProjectName(ownerUserId: string, projectId: string, name: string) {
      const [row] = castProjects(
        await db
          .update(projects)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(projects.ownerUserId, ownerUserId), eq(projects.id, projectId)))
          .returning()
      );

      return row ?? null;
    },

    async softDeleteProject(ownerUserId: string, projectId: string) {
      const [row] = castProjects(
        await db
          .update(projects)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(projects.ownerUserId, ownerUserId), eq(projects.id, projectId)))
          .returning()
      );

      return row ?? null;
    },

    async restoreProject(ownerUserId: string, projectId: string) {
      const [row] = castProjects(
        await db
          .update(projects)
          .set({ deletedAt: null, updatedAt: new Date() })
          .where(and(eq(projects.ownerUserId, ownerUserId), eq(projects.id, projectId)))
          .returning()
      );

      return row ?? null;
    }
  };
}
