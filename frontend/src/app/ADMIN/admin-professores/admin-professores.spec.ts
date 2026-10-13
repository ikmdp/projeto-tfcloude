import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminProfessores } from './admin-professores';

describe('AdminProfessores', () => {
  let component: AdminProfessores;
  let fixture: ComponentFixture<AdminProfessores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProfessores],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProfessores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
