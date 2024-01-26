import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }
  @Post('register')
 async register(@Body() registerUser: RegisterUserDto) {
    console.log('registerUser :>> ', registerUser);
     return await  this.userService.register(registerUser);
  }
}
