// db-utils.js
const { PrismaClient } = require('@prisma/client');

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.isConnected = false;
  }

  async connect() {
    try {
      // Test the connection
      await this.prisma.$connect();
      console.log('✅ Connected to SQLite database successfully');
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Database connection error:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await this.prisma.$disconnect();
        console.log('🔌 Disconnected from database');
        this.isConnected = false;
      }
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  // Helper methods for JSON handling
  _serializeArray(array) {
    return Array.isArray(array) ? JSON.stringify(array) : '[]';
  }

  _deserializeArray(jsonString) {
    try {
      return JSON.parse(jsonString || '[]');
    } catch {
      return [];
    }
  }

  _transformJobForOutput(job) {
    if (!job) return null;
    
    return {
      ...job,
      emails: this._deserializeArray(job.emails),
      phones: this._deserializeArray(job.phones)
    };
  }

  _transformJobForInput(jobData) {
    return {
      ...jobData,
      emails: this._serializeArray(jobData.emails),
      phones: this._serializeArray(jobData.phones)
    };
  }

  // CRUD Operations
  async createJob(jobData) {
    try {
      const transformedData = this._transformJobForInput(jobData);
      const job = await this.prisma.ausbildung.create({
        data: {
          title: transformedData.title,
          institution: transformedData.institution,
          location: transformedData.location || 'N/A',
          startDate: transformedData.start_date || 'N/A',
          vacancies: transformedData.vacancies || 'N/A',
          description: transformedData.description || 'N/A',
          emails: transformedData.emails,
          phones: transformedData.phones,
          url: transformedData.url
        }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation, try to update existing
        return await this.updateJobByUrl(jobData.url, jobData);
      }
      throw error;
    }
  }

  async updateJobStatus(id, newStatus) {
    return this.prisma.ausbildung.update({
      where: { id },
      data: { status: newStatus },
    });
  }
  
  async findJobById(id) {
    try {
      const job = await this.prisma.ausbildung.findUnique({
        where: { id }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error finding job by ID:', error);
      return null;
    }
  }

  async findJobByUrl(url) {
    try {
      const job = await this.prisma.ausbildung.findUnique({
        where: { url }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error finding job by URL:', error);
      return null;
    }
  }

  async findAllJobs(filter = {}, limit = 0, skip = 0) {
    try {
      const where = {};
      
      // Build where clause from filter
      if (filter.institution) {
        where.institution = { contains: filter.institution };
      }
      if (filter.location) {
        where.location = { contains: filter.location };
      }
      if (filter.title) {
        where.title = { contains: filter.title };
      }

      const jobs = await this.prisma.ausbildung.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(skip > 0 && { skip }),
        ...(limit > 0 && { take: limit })
      });

      return jobs.map(job => this._transformJobForOutput(job));
    } catch (error) {
      console.error('Error finding jobs:', error);
      return [];
    }
  }

  async findJobsWithoutMotivationLetter() {
    try {
      const jobs = await this.prisma.ausbildung.findMany({
        where: {
          AND: [
            { emails: { not: '[]' } },
            { 
              OR: [
                { motivationLetterPath: null },
                { motivationLetterPath: '' }
              ]
            }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      return jobs.map(job => ({
        ...this._transformJobForOutput(job),
        _id: job.id, // Add _id for compatibility with existing code
        toObject: () => this._transformJobForOutput(job)
      }));
    } catch (error) {
      console.error('Error finding jobs without motivation letters:', error);
      return [];
    }
  }

  async updateJobById(id, updateData) {
    try {
      const transformedData = this._transformJobForInput(updateData);
      const job = await this.prisma.ausbildung.update({
        where: { id },
        data: {
          ...(transformedData.title && { title: transformedData.title }),
          ...(transformedData.institution && { institution: transformedData.institution }),
          ...(transformedData.location && { location: transformedData.location }),
          ...(transformedData.start_date && { startDate: transformedData.start_date }),
          ...(transformedData.vacancies && { vacancies: transformedData.vacancies }),
          ...(transformedData.description && { description: transformedData.description }),
          ...(transformedData.emails && { emails: transformedData.emails }),
          ...(transformedData.phones && { phones: transformedData.phones })
        }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error updating job by ID:', error);
      return null;
    }
  }

  async updateJobByUrl(url, updateData) {
    try {
      const transformedData = this._transformJobForInput(updateData);
      const job = await this.prisma.ausbildung.update({
        where: { url },
        data: {
          ...(transformedData.title && { title: transformedData.title }),
          ...(transformedData.institution && { institution: transformedData.institution }),
          ...(transformedData.location && { location: transformedData.location }),
          ...(transformedData.start_date && { startDate: transformedData.start_date }),
          ...(transformedData.vacancies && { vacancies: transformedData.vacancies }),
          ...(transformedData.description && { description: transformedData.description }),
          ...(transformedData.emails && { emails: transformedData.emails }),
          ...(transformedData.phones && { phones: transformedData.phones })
        }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error updating job by URL:', error);
      return null;
    }
  }

  async updateMotivationLetterPath(id, filePath) {
    try {
      const job = await this.prisma.ausbildung.update({
        where: { id },
        data: { motivationLetterPath: filePath }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error updating motivation letter path:', error);
      return null;
    }
  }

  async deleteJobById(id) {
    try {
      const job = await this.prisma.ausbildung.delete({
        where: { id }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error deleting job by ID:', error);
      return null;
    }
  }

  async deleteJobByUrl(url) {
    try {
      const job = await this.prisma.ausbildung.delete({
        where: { url }
      });
      return this._transformJobForOutput(job);
    } catch (error) {
      console.error('Error deleting job by URL:', error);
      return null;
    }
  }

  // Statistics and Analytics
  async getJobStats() {
    try {
      const totalJobs = await this.prisma.ausbildung.count();
      
      const jobsWithEmails = await this.prisma.ausbildung.count({
        where: { emails: { not: '[]' } }
      });
      
      const jobsWithMotivationLetters = await this.prisma.ausbildung.count({
        where: { 
          motivationLetterPath: { not: null },
          motivationLetterPath: { not: '' }
        }
      });

      // Top institutions
      const institutionStats = await this.prisma.$queryRaw`
        SELECT institution as _id, COUNT(*) as count 
        FROM ausbildung 
        GROUP BY institution 
        ORDER BY count DESC 
        LIMIT 10
      `;

      // Location stats
      const locationStatsRaw = await this.prisma.$queryRaw`
        SELECT location as _id, COUNT(*) as count 
        FROM ausbildung 
        WHERE location != 'N/A' 
        GROUP BY location 
        ORDER BY count DESC 
        LIMIT 10
      `;

      return {
        totalJobs,
        jobsWithEmails,
        jobsWithMotivationLetters,
        jobsWithoutMotivationLetters: jobsWithEmails - jobsWithMotivationLetters,
        topInstitutions: institutionStats,
        locationStats: locationStatsRaw
      };
    } catch (error) {
      console.error('Error getting job statistics:', error);
      return null;
    }
  }

  async searchJobs(searchTerm, searchFields = ['title', 'institution', 'location']) {
    try {
      const orConditions = searchFields.map(field => ({
        [field]: { contains: searchTerm, mode: 'insensitive' }
      }));

      const jobs = await this.prisma.ausbildung.findMany({
        where: { OR: orConditions },
        orderBy: { createdAt: 'desc' }
      });

      return jobs.map(job => this._transformJobForOutput(job));
    } catch (error) {
      console.error('Error searching jobs:', error);
      return [];
    }
  }

  // Bulk operations
  async bulkCreateJobs(jobsArray) {
    try {
      const results = {
        created: 0,
        updated: 0,
        failed: 0,
        errors: []
      };

      for (const jobData of jobsArray) {
        try {
          const existingJob = await this.findJobByUrl(jobData.url);
          
          if (existingJob) {
            await this.updateJobByUrl(jobData.url, jobData);
            results.updated++;
          } else {
            await this.createJob(jobData);
            results.created++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            url: jobData.url,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk create operation:', error);
      throw error;
    }
  }

  async cleanupOldJobs(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await this.prisma.ausbildung.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });
      
      console.log(`🧹 Cleaned up ${result.count} jobs older than ${daysOld} days`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }

  // Export/Import functionality
  async exportToJSON(filename = null) {
    try {
      const jobs = await this.findAllJobs();
      const exportData = {
        exportDate: new Date().toISOString(),
        totalJobs: jobs.length,
        jobs: jobs
      };

      if (filename) {
        const fs = require('fs').promises;
        await fs.writeFile(filename, JSON.stringify(exportData, null, 2), 'utf8');
        console.log(`📁 Data exported to ${filename}`);
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importFromJSON(filename) {
    try {
      const fs = require('fs').promises;
      const fileContent = await fs.readFile(filename, 'utf8');
      const importData = JSON.parse(fileContent);
      
      if (!importData.jobs || !Array.isArray(importData.jobs)) {
        throw new Error('Invalid import file format');
      }

      const result = await this.bulkCreateJobs(importData.jobs);
      console.log(`🔥 Import completed: ${result.created} created, ${result.updated} updated, ${result.failed} failed`);
      
      return result;
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
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

}



module.exports = {
  DatabaseManager
};