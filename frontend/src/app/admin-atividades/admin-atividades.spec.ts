import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminAtividades } from './admin-atividades';

describe('AdminAtividades', () => {
  let component: AdminAtividades;
  let fixture: ComponentFixture<AdminAtividades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminAtividades],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminAtividades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
