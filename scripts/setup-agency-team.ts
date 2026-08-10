/**
 * Enable Agency team on Jan's Sklyvo workspace and add Filip + Matěj.
 *
 * Usage: npx tsx scripts/setup-agency-team.ts
 */
import "dotenv/config";
import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";

const WORKSPACE_ID = "cmp4j5md9000bfgngy5sb3otz"; // jan@venegard.com — 830 leadů

const MEMBERS = [
 { email: "filip@venegard.com", name: "Filip Retzl", role: "MEMBER" as const },
 { email: "matej@venegard.com", name: "Matěj Pazdera", role: "MEMBER" as const },
];

async function main() {
 const workspace = await prisma.workspace.update({
 where: { id: WORKSPACE_ID },
 data: {
 planTier: "AGENCY",
 name: "Sklyvo",
 },
 select: { id: true, name: true, planTier: true },
 });
 console.log("Workspace:", workspace);

 const created: Array<{ email: string; password: string; mode: string }> = [];

 for (const m of MEMBERS) {
 const existing = await prisma.user.findFirst({
 where: { email: { equals: m.email, mode: "insensitive" } },
 });

 if (existing) {
 await prisma.user.update({
 where: { id: existing.id },
 data: {
 workspaceId: WORKSPACE_ID,
 role: m.role,
 name: existing.name?.trim() || m.name,
 },
 });
 created.push({ email: m.email, password: "(už měl účet — heslo beze změny)", mode: "moved" });
 continue;
 }

 const password = randomBytes(5).toString("hex");
 await prisma.user.create({
 data: {
 email: m.email,
 name: m.name,
 passwordHash: password,
 workspaceId: WORKSPACE_ID,
 role: m.role,
 },
 });
 created.push({ email: m.email, password, mode: "created" });
 }

 const members = await prisma.user.findMany({
 where: { workspaceId: WORKSPACE_ID },
 select: { email: true, name: true, role: true },
 orderBy: { role: "asc" },
 });

 console.log("\nČlenové workspace:");
 for (const u of members) {
 console.log(` ${u.role.padEnd(6)} ${u.email} (${u.name})`);
 }

 console.log("\nPřístupy / hesla:");
 for (const c of created) {
 console.log(` ${c.email}: ${c.password} [${c.mode}]`);
 }
}

main()
 .catch((e) => {
 console.error(e);
 process.exitCode = 1;
 })
 .finally(async () => {
 await prisma.$disconnect();
 });
