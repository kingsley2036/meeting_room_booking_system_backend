import { Injectable } from '@nestjs/common';
import { createTransport, Transporter} from 'nodemailer';


@Injectable()
export class EmailService {
  transporter: Transporter;
  constructor() {
    this.transporter = createTransport({
      host: 'smtp.qq.com',
      port: 587,
      secure: false,
      auth: {
        user: 'kingsley2036@qq.com',
        pass:'ztefxjzuybfxeefb'
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
