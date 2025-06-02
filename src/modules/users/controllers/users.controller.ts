import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UsersService } from '../services/users.service';
UsersService;
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
