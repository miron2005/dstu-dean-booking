import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewAppointment } from './new-appointment';

describe('NewAppointment', () => {
  let component: NewAppointment;
  let fixture: ComponentFixture<NewAppointment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewAppointment],
    }).compileComponents();

    fixture = TestBed.createComponent(NewAppointment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
