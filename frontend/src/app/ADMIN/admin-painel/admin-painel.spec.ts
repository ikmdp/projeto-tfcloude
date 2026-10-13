import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminPainel } from './admin-painel';

describe('AdminPainel', () => {
  let component: AdminPainel;
  let fixture: ComponentFixture<AdminPainel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPainel],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPainel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
