import { DataSource } from 'typeorm';
import { Speaker, SpeakerStatus } from '../speakers/entities/speaker.entity';
import { SpeakerSample } from '../speakers/entities/speaker-sample.entity';
import { typeOrmModuleOptions } from './typeorm.config';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const configService = new ConfigService();

async function seed() {
  console.log('🌱 Starting database seed...');

  // Create DataSource
  const dataSource = new DataSource(
    typeOrmModuleOptions(configService) as any,
  );

  try {
    // Initialize connection
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const speakerRepository = dataSource.getRepository(Speaker);
    const sampleRepository = dataSource.getRepository(SpeakerSample);

    // Sample speakers data
    const sampleSpeakers = [
      {
        name: 'Nguyễn Văn A',
        status: SpeakerStatus.ACTIVE,
        extra: {
          description: 'Sample speaker 1',
          department: 'Engineering',
        },
      },
      {
        name: 'Trần Thị B',
        status: SpeakerStatus.ACTIVE,
        extra: {
          description: 'Sample speaker 2',
          department: 'Product',
        },
      },
      {
        name: 'Lê Văn C',
        status: SpeakerStatus.ACTIVE,
        extra: {
          description: 'Sample speaker 3',
          department: 'Design',
        },
      },
    ];

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Cleaning existing seed data...');
    const existingSpeakers = await speakerRepository.find({
      where: sampleSpeakers.map((s) => ({ name: s.name })),
    });
    if (existingSpeakers.length > 0) {
      await speakerRepository.remove(existingSpeakers);
      console.log(`   Removed ${existingSpeakers.length} existing speakers`);
    }

    // Create speakers
    console.log('👥 Creating sample speakers...');
    const createdSpeakers: Speaker[] = [];

    for (const speakerData of sampleSpeakers) {
      // Check if speaker already exists
      let speaker = await speakerRepository.findOne({
        where: { name: speakerData.name },
      });

      if (!speaker) {
        speaker = speakerRepository.create(speakerData);
        speaker = await speakerRepository.save(speaker);
        console.log(`   ✅ Created speaker: ${speaker.name} (${speaker.id})`);
      } else {
        console.log(`   ⚠️  Speaker already exists: ${speaker.name}`);
      }

      createdSpeakers.push(speaker);
    }

    // Create sample metadata for speakers (without actual audio files)
    console.log('📝 Creating speaker sample metadata...');
    for (const speaker of createdSpeakers) {
      // Check if samples already exist
      const existingSamples = await sampleRepository.find({
        where: { speaker: { id: speaker.id } },
      });

      if (existingSamples.length === 0) {
        // Create 2 sample metadata entries per speaker
        const sample1 = sampleRepository.create({
          speaker,
          originalFilename: `${speaker.name.toLowerCase().replace(/\s+/g, '_')}_sample_1.wav`,
          storedFilename: `sample_${speaker.id}_1.wav`,
          storagePath: `speakers/${speaker.id}/sample_1.wav`,
          mimeType: 'audio/wav',
          size: 1024000, // 1MB placeholder
        });

        const sample2 = sampleRepository.create({
          speaker,
          originalFilename: `${speaker.name.toLowerCase().replace(/\s+/g, '_')}_sample_2.wav`,
          storedFilename: `sample_${speaker.id}_2.wav`,
          storagePath: `speakers/${speaker.id}/sample_2.wav`,
          mimeType: 'audio/wav',
          size: 1024000, // 1MB placeholder
        });

        await sampleRepository.save([sample1, sample2]);
        console.log(`   ✅ Created 2 sample metadata entries for ${speaker.name}`);
      } else {
        console.log(`   ⚠️  Samples already exist for ${speaker.name}`);
      }
    }

    console.log('\n✨ Seed completed successfully!');
    console.log(`   - Created/Updated ${createdSpeakers.length} speakers`);
    console.log(
      `   - Created sample metadata for ${createdSpeakers.length} speakers`,
    );

    // Display summary
    const allSpeakers = await speakerRepository.find({
      relations: ['samples'],
    });
    console.log('\n📊 Database Summary:');
    console.log(`   Total speakers: ${allSpeakers.length}`);
    allSpeakers.forEach((s) => {
      console.log(
        `   - ${s.name} (${s.status}): ${s.samples?.length || 0} samples`,
      );
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // Close connection
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run seed
seed()
  .then(() => {
    console.log('✅ Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

