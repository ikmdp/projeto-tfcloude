import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminRelatorios } from './admin-relatorios';

describe('AdminRelatorios', () => {
  let component: AdminRelatorios;
  let fixture: ComponentFixture<AdminRelatorios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRelatorios],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRelatorios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
