import {  Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter} from 'nodemailer';


@Injectable()
export class EmailService {
  transporter: Transporter;
  constructor(private configService: ConfigService) {
    this.transporter = createTransport({
      host: this.configService.get('nodemailer_host'),
      port: this.configService.get('nodemailer_port'),
      secure: false,
      auth: {
        user: this.configService.get('nodemailer_auth_user'),
        pass: this.configService.get('nodemailer_auth_pass')
      }
    });
  }
  async sendEmail({ to, subject, html }) {
    const info = await this.transporter.sendMail({
      from: {
        name: '会议室预定系统',
        address: 'kingsley2036@qq.com'
      },
      to: to,
      subject,
      html
    });
    return info
  }
}
