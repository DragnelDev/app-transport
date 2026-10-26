import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar resumen del dashboard' })
  resumen() {
    return this.service.resumen();
  }
}
