import { DataSource } from 'typeorm';
import { Speaker, SpeakerStatus } from '../speakers/entities/speaker.entity';
import { SpeakerSample } from '../speakers/entities/speaker-sample.entity';
import { Meeting, MeetingStatus } from '../meetings/entities/meeting.entity';
import { Upload } from '../meetings/entities/upload.entity';
import { Utterance } from '../meetings/entities/utterance.entity';
import { typeOrmModuleOptions } from './typeorm.config';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const configService = new ConfigService();

async function seed() {
  console.log('🌱 Starting database seed...');

  // Merge base TypeORM options and ensure speaker entities are present
  const baseOptions = typeOrmModuleOptions(configService) as any;
  const dataSourceOptions = {
    ...baseOptions,
    entities: Array.isArray(baseOptions.entities)
      ? Array.from(new Set([...baseOptions.entities, Speaker, SpeakerSample]))
      : [Speaker, SpeakerSample],
    synchronize: baseOptions.synchronize ?? true,
  };

  const dataSource = new DataSource(dataSourceOptions as any);

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const speakerRepository = dataSource.getRepository(Speaker);
    const sampleRepository = dataSource.getRepository(SpeakerSample);

    const sampleSpeakers = [
      {
        name: 'Nguyễn Văn A',
        status: SpeakerStatus.ACTIVE,
        extra: { description: 'Sample speaker 1', department: 'Engineering' },
      },
      {
        name: 'Trần Thị B',
        status: SpeakerStatus.ACTIVE,
        extra: { description: 'Sample speaker 2', department: 'Product' },
      },
      {
        name: 'Lê Văn C',
        status: SpeakerStatus.ACTIVE,
        extra: { description: 'Sample speaker 3', department: 'Design' },
      },
    ];

    console.log('👥 Ensuring sample speakers exist...');
    const createdSpeakers: Speaker[] = [];

    for (const sd of sampleSpeakers) {
      // findOne may return undefined/null depending on TypeORM version
      let speaker = (await speakerRepository.findOne({ where: { name: sd.name } })) as Speaker | null;

      if (!speaker) {
        const toCreate = speakerRepository.create(sd as any);
        const saved = await speakerRepository.save(toCreate as any);
        if (Array.isArray(saved)) {
          speaker = saved[0] as Speaker;
        } else {
          speaker = saved as Speaker;
        }
        console.log(`   ✅ Created speaker: ${speaker.name} (${speaker.id})`);
      } else {
        let needSave = false;
        if (speaker.status !== sd.status) {
          speaker.status = sd.status as SpeakerStatus;
          needSave = true;
        }
        if (JSON.stringify(speaker.extra) !== JSON.stringify(sd.extra)) {
          speaker.extra = sd.extra as any;
          needSave = true;
        }
        if (needSave) {
          const saved = await speakerRepository.save(speaker as any);
          speaker = Array.isArray(saved) ? (saved[0] as Speaker) : (saved as Speaker);
          console.log(`   ♻️  Updated speaker: ${speaker.name} (${speaker.id})`);
        } else {
          console.log(`   ⚠️  Speaker already up-to-date: ${speaker.name}`);
        }
      }

      createdSpeakers.push(speaker);
    }

    console.log('📝 Creating speaker sample metadata...');
    for (const speaker of createdSpeakers) {
      const existingSamples = await sampleRepository.find({ where: { speaker: { id: speaker.id } } });
      if (existingSamples.length === 0) {
        const sample1 = sampleRepository.create({
          speaker,
          originalFilename: `${speaker.name.toLowerCase().replace(/\s+/g, '_')}_sample_1.wav`,
          storedFilename: `sample_${speaker.id}_1.wav`,
          storagePath: `speakers/${speaker.id}/sample_1.wav`,
          mimeType: 'audio/wav',
          size: 1024000,
        });

        const sample2 = sampleRepository.create({
          speaker,
          originalFilename: `${speaker.name.toLowerCase().replace(/\s+/g, '_')}_sample_2.wav`,
          storedFilename: `sample_${speaker.id}_2.wav`,
          storagePath: `speakers/${speaker.id}/sample_2.wav`,
          mimeType: 'audio/wav',
          size: 1024000,
        });

        await sampleRepository.save([sample1, sample2]);
        console.log(`   ✅ Created 2 sample metadata entries for ${speaker.name}`);
      } else {
        console.log(`   ⚠️  Samples already exist for ${speaker.name}`);
      }
    }

    console.log('\n✨ Seed completed successfully!');
    console.log(`   - Created/Updated ${createdSpeakers.length} speakers`);

    const allSpeakers = await speakerRepository.find({ relations: ['samples'] });
    console.log('\n📊 Database Summary:');
    console.log(`   Total speakers: ${allSpeakers.length}`);
    allSpeakers.forEach((s) => {
      console.log(`   - ${s.name} (${s.status}): ${s.samples?.length || 0} samples`);
    });

    // --- Seed sample meetings ---
    console.log('\n📅 Creating sample meetings...');
    const meetingRepository = dataSource.getRepository(Meeting);

    // create one sample meeting linked to existing speakers via utterances
    const sampleMeetingTitle = 'Project Sync - Sample Meeting';
    let meeting = (await meetingRepository.findOne({ where: { title: sampleMeetingTitle } })) as Meeting | null;

    if (!meeting) {
      const utterances: Partial<Utterance>[] = [
        { speaker: createdSpeakers[0].name, text: 'Chào mọi người, bắt đầu cuộc họp.' },
        { speaker: createdSpeakers[1].name, text: 'Hôm nay chúng ta sẽ bàn về sản phẩm.' },
        { speaker: createdSpeakers[2].name, text: 'Tôi cập nhật về thiết kế.' },
      ];

      const uploads: Partial<Upload>[] = [
        {
          originalFilename: 'meeting_record.mp4',
          storedFilename: 'meeting_record_1.mp4',
          mimeType: 'video/mp4',
          size: 1024 * 1024 * 5,
          storagePath: `meetings/sample/meeting_record_1.mp4`,
          durationSeconds: 600,
        },
      ];

      const toCreate = meetingRepository.create({
        title: sampleMeetingTitle,
        description: 'This is a seeded sample meeting for testing',
        status: MeetingStatus.COMPLETED,
        totalSegments: 1,
        completedSegments: 1,
        utterances,
        uploads,
      } as any);

      const saved = await meetingRepository.save(toCreate as any);
      meeting = Array.isArray(saved) ? (saved[0] as Meeting) : (saved as Meeting);
      console.log(`   ✅ Created meeting: ${meeting.title} (${meeting.id})`);
    } else {
      console.log(`   ⚠️  Meeting already exists: ${meeting.title}`);
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    try {
      if (dataSource && dataSource.isInitialized) await dataSource.destroy();
    } catch (e) {
      // ignore
    }
  }
}

seed()
  .then(() => {
    console.log('✅ Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed script failed:', error);
    process.exit(1);
  });

