// db-utils.js (Corrected)
const { PrismaClient } = require('@prisma/client');

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async connect() { await this.prisma.$connect(); }
  async disconnect() { await this.prisma.$disconnect(); }

  _serializeArray(array) { return JSON.stringify(array || []); }
  _deserializeArray(jsonString) {
    try { return JSON.parse(jsonString || '[]'); } catch { return []; }
  }

  _transformJobForOutput(job) {
    if (!job) return null;
    return {
      // ... (other fields: id, title, etc.)
      id: job.id,
      title: job.title,
      institution: job.institution,
      location: job.location,
      startDate: job.startDate,
      vacancies: job.vacancies,
      description: job.description,
      emails: this._deserializeArray(job.emails),
      phones: this._deserializeArray(job.phones),
      url: job.url,
      motivationLetterPath: job.motivationLetterPath,
      status: job.status, // --- ADD THIS LINE ---
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      toObject: () => this._transformJobForOutput(job)
    };
  }
  
  async updateJobStatus(id, newStatus) {
    return this.prisma.ausbildung.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  _transformJobForInput(jobData) {
    return {
      title: jobData.title,
      institution: jobData.institution,
      location: jobData.location || 'N/A',
      startDate: jobData.start_date || 'N/A',
      vacancies: jobData.vacancies || 'N/A',
      description: jobData.description || 'N/A',
      emails: this._serializeArray(jobData.emails),
      phones: this._serializeArray(jobData.phones),
      url: jobData.url
    };
  }

  async createJob(jobData) {
    const data = this._transformJobForInput(jobData);
    const job = await this.prisma.ausbildung.create({ data });
    return this._transformJobForOutput(job);
  }
  
  async findJobById(id) {
    const job = await this.prisma.ausbildung.findUnique({ where: { id } });
    return this._transformJobForOutput(job);
  }

  async findJobByUrl(url) {
    const job = await this.prisma.ausbildung.findUnique({ where: { url } });
    return this._transformJobForOutput(job);
  }

  async updateJobByUrl(url, jobData) {
    const data = this._transformJobForInput(jobData);
    const job = await this.prisma.ausbildung.update({ where: { url }, data });
    return this._transformJobForOutput(job);
  }

  async findAllJobs() {
    const jobs = await this.prisma.ausbildung.findMany({ orderBy: { createdAt: 'desc' } });
    return jobs.map(j => this._transformJobForOutput(j));
  }

  async findJobsWithoutMotivationLetter() {
    const jobs = await this.prisma.ausbildung.findMany({
      where: { AND: [{ emails: { not: '[]' } }, { motivationLetterPath: null }] },
      orderBy: { createdAt: 'desc' }
    });
    return jobs.map(job => this._transformJobForOutput(job));
  }
  
  async updateMotivationLetterPath(id, filePath) {
    const job = await this.prisma.ausbildung.update({ where: { id }, data: { motivationLetterPath: filePath } });
    return this._transformJobForOutput(job);
  }
  
  async getJobStats() {
    try {
      const totalJobs = await this.prisma.ausbildung.count();
      const jobsWithMotivationLetters = await this.prisma.ausbildung.count({
        where: { motivationLetterPath: { not: null } }
      });

      // MODIFIED: Replaced raw SQL with Prisma's type-safe aggregation
      const topInstitutionsData = await this.prisma.ausbildung.groupBy({
        by: ['institution'],
        _count: {
          institution: true,
        },
        orderBy: {
          _count: {
            institution: 'desc',
          },
        },
        take: 5,
      });

      // Format the data to match the expected output
      const topInstitutions = topInstitutionsData.map(item => ({
        _id: item.institution,
        count: item._count.institution
      }));

      return {
        totalJobs,
        jobsWithMotivationLetters,
        topInstitutions
      };
    } catch (error) {
      console.error('Error getting job stats:', error);
      throw new Error('Could not retrieve job statistics from the database.');
    }
  }

  async cleanupOldJobs(daysOld) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const result = await this.prisma.ausbildung.deleteMany({ where: { createdAt: { lt: cutoffDate } } });
    return result.count;
  }
}

module.exports = { DatabaseManager };