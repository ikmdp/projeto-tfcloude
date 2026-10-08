import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlunoLayout } from './aluno-layout';

describe('AlunoLayout', () => {
  let component: AlunoLayout;
  let fixture: ComponentFixture<AlunoLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlunoLayout],
    }).compileComponents();

    fixture = TestBed.createComponent(AlunoLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
