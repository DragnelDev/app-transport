import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('General')
@ApiBearerAuth('bearer')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar mensaje de bienvenida' })
  getHello(): string {
    return this.appService.getHello();
  }
}
