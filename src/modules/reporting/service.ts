import { prisma } from "@/lib/db";

export async function createExportJob(
  type: string,
  format: string,
  filters: Record<string, unknown>,
  requestedById: string
) {
  return prisma.exportJob.create({
    data: {
      type,
      format,
      filters: JSON.stringify(filters),
      requestedById,
      status: "queued",
    },
  });
}

export async function getExportJobs(requestedById?: string) {
  return prisma.exportJob.findMany({
    where: requestedById ? { requestedById } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function completeExportJob(id: string, fileUrl: string) {
  return prisma.exportJob.update({
    where: { id },
    data: { status: "completed", fileUrl, completedAt: new Date() },
  });
}

export async function failExportJob(id: string) {
  return prisma.exportJob.update({
    where: { id },
    data: { status: "failed" },
  });
}
