import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMeetingRoomDto } from './dto/create-meeting-room.dto';
import { UpdateMeetingRoomDto } from './dto/update-meeting-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { MeetingRoom } from './entities/meeting-room.entity';
import { Like, Repository } from 'typeorm';

@Injectable()
export class MeetingRoomService {
  @InjectRepository(MeetingRoom)
  private readonly repository: Repository<MeetingRoom>;

  initData() {
    const room1 = new MeetingRoom();
    room1.name = '木星';
    room1.capacity = 10;
    room1.equipment = '白板';
    room1.location = '一层西';

    const room2 = new MeetingRoom();
    room2.name = '金星';
    room2.capacity = 5;
    room2.equipment = '';
    room2.location = '二层东';

    const room3 = new MeetingRoom();
    room3.name = '天王星';
    room3.capacity = 30;
    room3.equipment = '白板，电视';
    room3.location = '三层东';

    this.repository.save([room1, room2, room3]);
  }
  async find(pageNo: number, pageSize: number,name: string, capacity: number, equipment: string) {
    if (pageNo < 1) {
      throw new BadRequestException('页码最小为 1');
    }
    const skipCount = (pageNo - 1) * pageSize;
    const condition: Record<string, any> = {};
    if (name) {
      condition.name = Like(`%${name}%`);
    }
    if (capacity) {
      condition.capacity = capacity;
    }
    if (equipment) {
      condition.equipment = Like(`%${equipment}%`);
    }

    const [meetingRooms, totalCount] = await this.repository.findAndCount({
      take: pageSize,
      skip: skipCount,
      where: condition,
    });
    return { meetingRooms, totalCount };
  }

  async create(createMeetingRoomDto: CreateMeetingRoomDto) {
    const room = await this.repository.findOneBy({
      name: createMeetingRoomDto.name,
    });
    if (room) {
      throw new BadRequestException('会议室已存在');
    }
    return await this.repository.insert(createMeetingRoomDto);
  }

  findAll() {
    return `This action returns all meetingRoom`;
  }

  findOne(id: number) {
    return `This action returns a #${id} meetingRoom`;
  }
  async findById(id: number) {
    return this.repository.findOneBy({
      id,
    });
  }

  async update(updateMeetingRoomDto: UpdateMeetingRoomDto) {
    const meetingRoom = await this.repository.findOneBy({
      id: updateMeetingRoomDto.id,
    });
    if (!meetingRoom) {
      throw new BadRequestException('会议室不存在');
    }
    meetingRoom.capacity = updateMeetingRoomDto.capacity;
    meetingRoom.location = updateMeetingRoomDto.location;
    meetingRoom.name = updateMeetingRoomDto.name;

    if (updateMeetingRoomDto.description) {
      meetingRoom.description = updateMeetingRoomDto.description;
    }
    if (updateMeetingRoomDto.equipment) {
      meetingRoom.equipment = updateMeetingRoomDto.equipment;
    }
    await this.repository.update(updateMeetingRoomDto.id, meetingRoom);

    return 'sucess';
  }

  async delete(id: number) {
    await this.repository.delete({
      id,
    });
    return 'success';
  }
}
